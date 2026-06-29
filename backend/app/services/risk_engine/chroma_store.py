"""Persistencia y consulta en ChromaDB local."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, Optional

import chromadb

from app.services.campos_estandar import (
    leer_nombre_archivo_licitacion,
    leer_tipo_contrato,
    normalizar_payload_analisis,
)
from app.services.risk_engine.config import CHROMA_PATH, COLLECTION_NAME

logger = logging.getLogger(__name__)

_client = chromadb.PersistentClient(path=str(CHROMA_PATH))
collection = _client.get_or_create_collection(name=COLLECTION_NAME)


def build_chroma_id(filename_licitacion: str, proyecto: str, sector: str) -> str:
    base = re.sub(r"[^\w.-]", "_", filename_licitacion)
    return f"{proyecto}_{sector}_{base}"[:512]


def consultar_analisis_persistido(
    filename_licitacion: str,
    proyecto: str,
    sector: str,
) -> Dict[str, Any]:
    """Recupera un análisis previo desde ChromaDB."""
    try:
        # Construir condiciones dinámicas para evitar el error "Expected where to have exactly one operator"
        conditions = []
        if proyecto:
            conditions.append({
                "$or": [
                    {"tipo_contrato": proyecto},
                    {"proyecto": proyecto},
                ]
            })
        if sector:
            conditions.append({"sector": sector})

        if len(conditions) == 1:
            where_clause = conditions[0]
        elif len(conditions) > 1:
            where_clause = {"$and": conditions}
        else:
            where_clause = None  # Sin filtro

        resultado_chroma = collection.query(
            query_texts=[filename_licitacion],
            where=where_clause,
            n_results=1,
        )
        metadatas = resultado_chroma.get("metadatas") or []
        if not metadatas or not metadatas[0]:
            return {"origen_data": "NINGUNO", "datos": None}

        metadata = metadatas[0][0] or {}
        resultado_json = metadata.get("resultado_json")
        if not resultado_json:
            return {"origen_data": "NINGUNO", "datos": None}

        return {
            "origen_data": "VECTOR_DB",
            "datos": json.loads(resultado_json),
        }
    except json.JSONDecodeError as exc:
        logger.exception("JSON corrupto en ChromaDB: %s", exc)
    except Exception as exc:
        logger.exception("Error consultando ChromaDB: %s", exc)

    return {"origen_data": "NINGUNO", "datos": None}


def persistir_analisis(
    filename_licitacion: str,
    proyecto: str,
    sector: str,
    resultado: Dict[str, Any],
) -> None:
    """Guarda el análisis calibrado (post-middleware) en ChromaDB."""
    registro_id = build_chroma_id(filename_licitacion, proyecto, sector)
    metadata = {
        "tipo_contrato": proyecto,
        "sector": sector,
        "nombre_archivo_licitacion": filename_licitacion,
        "resultado_json": json.dumps(resultado, ensure_ascii=False),
    }
    try:
        collection.add(
            documents=[filename_licitacion],
            metadatas=[metadata],
            ids=[registro_id],
        )
    except Exception as exc:
        logger.warning("add() falló (%s); aplicando upsert", exc)
        try:
            collection.upsert(
                documents=[filename_licitacion],
                metadatas=[metadata],
                ids=[registro_id],
            )
        except Exception as upsert_exc:
            logger.exception("No se pudo persistir en ChromaDB: %s", upsert_exc)


def persistir_informe_para_descarga(id_analisis: str, informe: Dict[str, Any]) -> None:
    """Indexa el informe completo en ChromaDB bajo id_analisis para descarga PDF."""
    informe = normalizar_payload_analisis(informe)
    resultado = informe.get("resultado") or {}
    nombre_archivo = leer_nombre_archivo_licitacion(informe) or ""
    metadata = {
        "id_analisis": id_analisis,
        "tipo_contrato": str(leer_tipo_contrato(informe) or ""),
        "sector": str(informe.get("sector", "")),
        "nombre_archivo_licitacion": nombre_archivo,
        "status": str(informe.get("status", "")),
        "informe_completo_json": json.dumps(informe, ensure_ascii=False),
        "resultado_json": json.dumps(resultado, ensure_ascii=False),
    }
    try:
        collection.upsert(
            ids=[id_analisis],
            documents=[nombre_archivo or id_analisis],
            metadatas=[metadata],
        )
    except Exception as exc:
        logger.exception("No se pudo indexar informe para descarga: %s", exc)


def obtener_informe_desde_chroma(id_analisis: str) -> Optional[Dict[str, Any]]:
    """Recupera el JSON del informe indexado por id_analisis."""
    try:
        datos = collection.get(ids=[id_analisis], include=["metadatas"])
        ids = datos.get("ids") or []
        if ids and datos.get("metadatas"):
            informe = _informe_desde_metadata(datos["metadatas"][0])
            if informe:
                return informe

        filtrado = collection.get(
            where={"id_analisis": id_analisis},
            include=["metadatas"],
        )
        metadatas = filtrado.get("metadatas") or []
        if metadatas and metadatas[0]:
            return _informe_desde_metadata(metadatas[0])
    except Exception as exc:
        logger.exception("Error recuperando informe %s desde ChromaDB: %s", id_analisis, exc)

    return None


def _informe_desde_metadata(metadata: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not metadata:
        return None
    completo = metadata.get("informe_completo_json")
    if completo:
        return normalizar_payload_analisis(json.loads(completo))
    resultado_json = metadata.get("resultado_json")
    if resultado_json:
        return normalizar_payload_analisis({
            "id_analisis": metadata.get("id_analisis"),
            "nombre_archivo_licitacion": metadata.get("nombre_archivo_licitacion")
            or metadata.get("archivo_licitacion"),
            "tipo_contrato": metadata.get("tipo_contrato") or metadata.get("proyecto"),
            "sector": metadata.get("sector"),
            "status": metadata.get("status"),
            "resultado": json.loads(resultado_json),
        })
    return None


def vaciar_coleccion() -> int:
    """
    Elimina todos los registros de la colección de riesgos.
    Retorna la cantidad de IDs eliminados.
    """
    try:
        datos = collection.get()
        ids = datos.get("ids") or []
        if ids:
            collection.delete(ids=ids)
            logger.info("ChromaDB: eliminados %d registros", len(ids))
            return len(ids)
        logger.info("ChromaDB: la colección ya estaba vacía")
        return 0
    except Exception as exc:
        logger.exception("Error vaciando ChromaDB: %s", exc)
        raise
