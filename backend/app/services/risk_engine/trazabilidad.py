"""Mapeo y validación de trazabilidad texto LLM ↔ PDF."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

from app.services.risk_engine.config import FRASES_EVASIVAS
from app.services.risk_engine.text_normalizer import normalizar_texto_para_busqueda

# Mínimo de palabras consecutivas para búsqueda por ventana (reduce falsos negativos)
MIN_PALABRAS_VENTANA: int = 6
MIN_CHARS_VENTANA: int = 30


def _buscar_cita_en_texto_normalizado(
    texto_pdf_completo: str,
    cita_llm: str,
) -> Tuple[int, int, str]:
    fuente_norm = normalizar_texto_para_busqueda(texto_pdf_completo)
    cita_norm = normalizar_texto_para_busqueda(cita_llm)

    if not fuente_norm or not cita_norm:
        return -1, 0, cita_llm[:200]

    idx = fuente_norm.find(cita_norm)
    if idx != -1:
        return idx, len(cita_norm), cita_norm

    palabras = cita_norm.split()
    if len(palabras) >= MIN_PALABRAS_VENTANA:
        for tam in range(len(palabras), MIN_PALABRAS_VENTANA - 1, -1):
            for i in range(len(palabras) - tam + 1):
                ventana = " ".join(palabras[i : i + tam])
                if len(ventana) < MIN_CHARS_VENTANA:
                    continue
                idx = fuente_norm.find(ventana)
                if idx != -1:
                    return idx, len(ventana), ventana

    return -1, 0, cita_norm[:200] if cita_norm else cita_llm[:200]


def _recortar_contexto_limpio(
    texto: str, indice: int, longitud: int, antes: int = 200, despues: int = 400
) -> str:
    """Recorta contexto respetando límites de palabras al inicio y fin."""
    inicio = max(0, indice - antes)
    fin = min(len(texto), indice + longitud + despues)

    fragmento = texto[inicio:fin]

    # Ajustar inicio: avanzar hasta el primer espacio si cortamos en medio de palabra
    if inicio > 0 and fragmento and not texto[inicio].isspace():
        primer_espacio = fragmento.find(" ")
        if primer_espacio != -1:
            fragmento = fragmento[primer_espacio + 1:]

    # Ajustar fin: retroceder hasta el último corte limpio
    if fin < len(texto) and fragmento and not texto[fin - 1].isspace():
        ultimo_corte = max(
            fragmento.rfind(". "),
            fragmento.rfind(", "),
            fragmento.rfind(" "),
        )
        if ultimo_corte != -1:
            fragmento = fragmento[: ultimo_corte + 1]

    return fragmento.strip()


def mapear_trazabilidad_documento(
    texto_pdf_completo: str,
    cita_llm: str,
    tipo_doc: str,
) -> Dict[str, Any]:
    if not texto_pdf_completo.strip() or not cita_llm.strip():
        return {
            "encontrado": False,
            "motivo": "Texto o cita vacíos",
            "cita_evaluada": cita_llm,
            "documento": tipo_doc,
        }

    indice, longitud, patron_usado = _buscar_cita_en_texto_normalizado(
        texto_pdf_completo, cita_llm
    )

    fuente_norm = normalizar_texto_para_busqueda(texto_pdf_completo)

    if indice != -1:
        return {
            "encontrado": True,
            "indice_aproximado_caracter": indice,
            "fragmento_literal_fuente": cita_llm.strip()[:800],
            "patron_coincidente_normalizado": patron_usado[:300],
            "documento": tipo_doc,
        }

    return {
        "encontrado": False,
        "motivo": "No se localizó el fragmento en el documento fuente",
        "cita_evaluada": cita_llm,
        "cita_normalizada_evaluada": normalizar_texto_para_busqueda(cita_llm)[:300],
        "documento": tipo_doc,
    }


def es_frase_evasiva(texto: str) -> bool:
    texto_lower = texto.lower()
    return any(frase in texto_lower for frase in FRASES_EVASIVAS)


def referencias_normativas_inventadas(
    sustento: str, texto_normativas: str
) -> List[str]:
    """Denominaciones legales citadas que no aparecen en la normativa."""
    if not sustento.strip() or not texto_normativas.strip():
        return []

    patrones = re.findall(
        r"(?:ley|decreto(?:\s+legislativo)?|reglamento|directiva|ordenanza|"
        r"resolución|supremo|ds\.?|d\.?\s*l\.?)\s*(?:n[°ºo.]?\s*)?[\w\-./]+",
        sustento,
        flags=re.IGNORECASE,
    )
    fuente_limpia = normalizar_texto_para_busqueda(texto_normativas)
    inventadas: List[str] = []
    for ref in patrones:
        ref_limpia = normalizar_texto_para_busqueda(ref)
        if len(ref_limpia) >= 8 and ref_limpia not in fuente_limpia:
            inventadas.append(ref.strip())
    return inventadas