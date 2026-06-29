"""Extracción de texto desde PDFs con pypdf."""

from __future__ import annotations

import logging
from pathlib import Path

from pypdf import PdfReader

logger = logging.getLogger(__name__)


def extraer_texto_de_pdf(path: str) -> str:
    """Extrae el texto completo de un único PDF."""
    ruta = Path(path)
    if not ruta.is_file():
        logger.warning("PDF no encontrado: %s", path)
        return ""

    fragmentos: list[str] = []
    try:
        reader = PdfReader(str(ruta))
        for page in reader.pages:
            fragmentos.append(page.extract_text() or "")
    except Exception as exc:
        logger.exception("Error extrayendo texto de %s: %s", path, exc)
        return ""

    return "\n".join(fragmentos).strip()


def extraer_texto_de_pdfs(paths: list[str]) -> str:
    """Concatena el texto de varios PDFs normativos."""
    bloques: list[str] = []
    for path in paths:
        texto = extraer_texto_de_pdf(path)
        if texto:
            bloques.append(texto)
    return "\n\n".join(bloques).strip()
