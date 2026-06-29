"""Normalización de texto para comparación fuzzy entre PDF y citas del LLM."""

from __future__ import annotations

import re


def normalizar_texto_para_busqueda(texto: str) -> str:
    """
    Desinfecta texto antes de comparar cita LLM vs PDF.
    Ignora saltos de línea, puntuación y variaciones de espaciado.
    """
    if not texto:
        return ""
    texto = texto.lower()
    texto = re.sub(r"[\r\n\t\-]+", " ", texto)
    texto = re.sub(r"[^\w\s]", "", texto, flags=re.UNICODE)
    return " ".join(texto.split())
