"""Guardrails semánticos sobre documentos normativos."""

from __future__ import annotations

from app.services.risk_engine.config import TERMINOS_INVALIDOS_NORMATIVA


def normativa_contiene_terminos_invalidos(texto_normativas: str) -> bool:
    """Detecta contenido técnico IA/Data Science en lugar de normativa legal."""
    if not texto_normativas.strip():
        return False
    texto_lower = texto_normativas.lower()
    return any(termino in texto_lower for termino in TERMINOS_INVALIDOS_NORMATIVA)
