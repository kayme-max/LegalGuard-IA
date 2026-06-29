"""
Prepara extractos para el LLM respetando los límites de contexto ampliados de Gemini.
El texto íntegro del PDF se conserva para trazabilidad (middleware).
"""

from __future__ import annotations

import logging
import os
import re
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)

# Ampliamos los buffers para aprovechar la ventana masiva de Gemini (1M tokens)
def _max_chars_licitacion() -> int:
    return int(os.getenv("MAX_CHARS_LICITACION_LLM", "2000000")) # Hasta ~500k tokens

def _max_chars_normativa() -> int:
    return int(os.getenv("MAX_CHARS_NORMATIVA_LLM", "2000000"))  # Permite leyes masivas completas

PALABRAS_CLAVE_LEGALES: Tuple[str, ...] = (
    "penalidad", "penalidades", "garantía", "garantias", "incumplimiento",
    "plazo", "plazos", "contrato", "convenio", "licitación", "licitacion",
    "obra", "artículo", "articulo", "inciso", "decreto", "ley", "reglamento",
    "multa", "sanción", "sancion", "rescisión", "resolucion", "resolución",
    "adenda", "modificación", "modificacion", "fianza", "cipgn", "ciprl",
    "supervisión", "supervision", "postor", "proponente", "bases", "cláusula",
    "clausula", "sótanos", "sotanos", "excavación", "excavacion", "construcción civil"
)

def estimar_tokens(texto: str) -> int:
    return max(1, len(texto) // 4)

def _puntuar_parrafo(parrafo: str, terminos_extra: List[str]) -> int:
    bajo = parrafo.lower()
    score = sum(2 for kw in PALABRAS_CLAVE_LEGALES if kw in bajo)
    score += sum(3 for t in terminos_extra if t and t.lower() in bajo)
    return score

def _extraer_inteligente(texto: str, max_chars: int, terminos_extra: List[str]) -> Tuple[str, bool]:
    """
    Si el texto excede max_chars, arma un extracto priorizando relevancia legal.
    Optimizado para no romper el flujo si el PDF carece de saltos de línea dobles.
    """
    if len(texto) <= max_chars:
        return texto, False

    terminos = [t.strip() for t in terminos_extra if t.strip()]
    
    # Intenta separar por párrafos, si falla o el bloque es único, fragmenta por líneas o bloques fijos
    parrafos = [p.strip() for p in re.split(r"\n\s*\n", texto) if p.strip()]
    if len(parrafos) <= 1:
        # CORRECCIÓN DE FALLBACK: Si el PDF viene en un solo bloque continuo, dividimos por líneas robustas
        parrafos = [p.strip() for p in texto.split("\n") if p.strip()]
    if not parrafos:
        parrafos = [texto[i : i + 1000] for i in range(0, len(texto), 1000)]

    cabecera_chars = min(5000, max_chars // 5)
    cierre_chars = min(4000, max_chars // 6)
    cabecera = texto[:cabecera_chars]
    cierre = texto[-cierre_chars:] if len(texto) > cierre_chars else ""
    presupuesto = max_chars - len(cabecera) - len(cierre) - 300

    ordenados = sorted(
        enumerate(parrafos),
        key=lambda x: _puntuar_parrafo(x[1], terminos),
        reverse=True,
    )

    seleccionados: List[Tuple[int, str]] = []
    usado = 0
    indices_elegidos: set[int] = set()

    for idx, parr in ordenados:
        if usado + len(parr) + 2 > presupuesto:
            continue
        seleccionados.append((idx, parr))
        usado += len(parr) + 2
        indices_elegidos.add(idx)
        if usado >= presupuesto * 0.98:
            break

    seleccionados.sort(key=lambda x: x[0])
    cuerpo = "\n\n".join(p for _, p in seleccionados)

    nota = (
        f"[EXTRACTO INTELIGENTE PARA ANÁLISIS: {len(cabecera) + len(cuerpo) + len(cierre):,} "
        f"de {len(texto):,} caracteres del documento original. "
        f"Priorizados párrafos con cláusulas, plazos y riesgos del sector.]\n\n"
    )
    extracto = nota + cabecera + "\n\n--- FRAGMENTOS RELEVANTES CONTEXTUALES ---\n\n" + cuerpo
    if cierre:
        extracto += "\n\n--- CIERRE DEL DOCUMENTO ---\n\n" + cierre

    if len(extracto) > max_chars:
        extracto = extracto[:max_chars]

    logger.info(
        "Texto optimizado para LLM: %d → %d chars (%d bloques seleccionados)",
        len(texto),
        len(extracto),
        len(seleccionados),
    )
    return extracto, True


def preparar_textos_para_llm(
    texto_licitacion: str,
    texto_normativas: str,
    proyecto: str,
    sector: str,
) -> Tuple[str, str, Dict[str, object]]:
    
    terminos = [proyecto, sector]
    
    # 1. Para la licitación conservamos el extracto si supera el límite máximo
    lic_llm, lic_recortado = _extraer_inteligente(
        texto_licitacion, _max_chars_licitacion(), terminos
    )
    
    norm_llm = ""
    norm_recortado = False
    
    # 2. REGLA DE GOBERNANZA ABSOLUTA PARA LEYES (Bypass total de colador):
    if texto_normativas.strip():
        max_normativa = _max_chars_normativa()

        #log temporal
        max_normativa = _max_chars_normativa()
        print(f"🔧 DEBUG: max_normativa cargado = {max_normativa} caracteres")
        logger.info("🔧 DEBUG: max_normativa cargado = %d", max_normativa)
        
        # FUERZO BRUTO: Si entra en la ventana masiva, se desactiva cualquier intento de colado
        if len(texto_normativas) <= max_normativa:
            norm_llm = texto_normativas
            norm_recortado = False  # Cambiado explícitamente a False
            logger.info("PROCESAMIENTO INTEGRAL: Las normativas se transmiten completas sin pasar por el extractor.")
        else:
            # Solo si el compendio de leyes supera los 2 millones de caracteres se aplica el filtro
            norm_llm, norm_recortado = _extraer_inteligente(
                texto_normativas, max_normativa, terminos
            )
    
    meta: Dict[str, object] = {
        "licitacion_recortada": lic_recortado,
        "normativa_recortada": norm_recortado,
        "chars_licitacion_original": len(texto_licitacion),
        "chars_licitacion_llm": len(lic_llm),
        "chars_normativa_original": len(texto_normativas),
        "chars_normativa_llm": len(norm_llm),
        "tokens_estimados_prompt": estimar_tokens(lic_llm) + estimar_tokens(norm_llm),
    }
    return lic_llm, norm_llm, meta