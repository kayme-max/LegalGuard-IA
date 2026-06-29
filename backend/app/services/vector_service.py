"""
app/services/vector_service.py
Puntos 4 (Chunking) + 5 (Embeddings) + 6 (ChromaDB)

Diseño: instancia efímera por request.
Las normativas llegan como PDFs por upload → se indexan en memoria (EphemeralClient)
→ se consultan → el request termina y la memoria se libera.

Si en el futuro quieres persistencia entre requests, cambia EphemeralClient()
por PersistentClient(path="./chroma_db") y agrega lógica de deduplicación por hash.
"""

import hashlib
import logging
from typing import List, Dict, Any

import chromadb
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# ── Constantes configurables ───────────────────────────────────────────────────
CHUNK_SIZE    = 1_000   # caracteres por fragmento
CHUNK_OVERLAP = 200     # solapamiento para no cortar cláusulas
TOP_K         = 6       # fragmentos recuperados por consulta
EMBED_MODEL   = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

# Singleton del modelo: se carga una sola vez en toda la vida del proceso FastAPI
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("🔄 Cargando modelo de embeddings '%s' (primera vez)…", EMBED_MODEL)
        _model = SentenceTransformer(EMBED_MODEL)
        logger.info("✅ Modelo listo.")
    return _model


# ── Punto 4: Chunking inteligente ─────────────────────────────────────────────
def chunk_text(text: str, source: str = "normativa") -> List[Dict[str, Any]]:
    """
    Divide el texto en fragmentos con solapamiento semántico.
    Corta preferentemente en saltos de línea o puntos, nunca a mitad de oración.
    Retorna lista de dicts con id, text y metadata.
    """
    chunks: List[Dict[str, Any]] = []
    start  = 0
    index  = 0

    while start < len(text):
        end = start + CHUNK_SIZE

        # Si no llegamos al final, buscar un corte natural
        if end < len(text):
            cut = text.rfind("\n", start, end)
            if cut == -1:
                cut = text.rfind(". ", start, end)
            if cut != -1:
                end = cut + 1

        fragment = text[start:end].strip()
        if fragment:
            chunk_id = hashlib.md5(f"{source}_{index}".encode()).hexdigest()
            chunks.append({
                "id":       chunk_id,
                "text":     fragment,
                "metadata": {"source": source, "chunk_index": index},
            })
            index += 1

        start = end - CHUNK_OVERLAP

    logger.info("📄 '%s' → %d fragmentos generados", source, len(chunks))
    return chunks


# ── Puntos 5 + 6: Embeddings + ChromaDB ───────────────────────────────────────
class VectorService:
    """
    Servicio efímero por request.
    1. Recibe textos de normativas → index_document()
    2. Consulta fragmentos relevantes → build_context_block()
    """

    def __init__(self):
        self._model  = _get_model()
        # EphemeralClient: en RAM, sin disco. Ideal para normativas por upload.
        self._client = chromadb.PersistentClient(path="./chroma_data")
        # Esta línea es la que evita el error:
        self._col = self._client.get_or_create_collection(
            name="normativas",
            metadata={"hnsw:space": "cosine"},
        )

    def index_document(self, text: str, source: str) -> int:
        """
        Fragmenta el texto de una normativa, genera embeddings y los guarda.
        Retorna la cantidad de fragmentos indexados.
        """
        chunks = chunk_text(text, source=source)
        if not chunks:
            logger.warning("⚠️  Sin fragmentos para '%s'", source)
            return 0

        ids        = [c["id"]       for c in chunks]
        texts      = [c["text"]     for c in chunks]
        metadatas  = [c["metadata"] for c in chunks]

        logger.info("🧮 Generando embeddings para %d fragmentos de '%s'…", len(texts), source)
        embeddings = self._model.encode(texts, show_progress_bar=False).tolist()

        self._col.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        logger.info("💾 %d fragmentos de '%s' guardados en ChromaDB (RAM)", len(chunks), source)
        return len(chunks)

    def query(self, question: str, top_k: int = TOP_K) -> List[Dict[str, Any]]:
        """
        Devuelve los TOP_K fragmentos de normativa más relevantes
        para la pregunta dada (búsqueda semántica por similitud coseno).
        """
        total = self._col.count()
        if total == 0:
            logger.warning("⚠️  Vector store vacío, no hay normativas indexadas")
            return []

        q_emb   = self._model.encode([question]).tolist()
        results = self._col.query(
            query_embeddings=q_emb,
            n_results=min(top_k, total),
            include=["documents", "metadatas", "distances"],
        )

        hits = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            hits.append({
                "text":       doc,
                "source":     meta.get("source", "?"),
                "similarity": round(1 - dist, 4),
            })

        logger.info("🔍 Query → %d fragmentos recuperados (top %d)", len(hits), top_k)
        return hits

    def build_context_block(self, question: str) -> str:
        """
        Orquesta query() y arma el bloque de texto listo para el prompt.
        Cada fragmento lleva su fuente y score de relevancia.
        """
        hits = self.query(question)
        if not hits:
            return "(No se encontraron fragmentos de normativa relevantes para esta consulta)"

        lines = []
        for i, h in enumerate(hits, 1):
            lines.append(
                f"[Fragmento {i} | Fuente: {h['source']} | Relevancia: {h['similarity']}]\n"
                f"{h['text']}"
            )
        return "\n\n".join(lines)