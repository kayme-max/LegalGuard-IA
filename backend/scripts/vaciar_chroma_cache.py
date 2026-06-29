#!/usr/bin/env python3
"""Vacia la colección local de análisis de riesgos en ChromaDB."""

import sys
from pathlib import Path

# Permite ejecutar desde backend/: python scripts/vaciar_chroma_cache.py
BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.services.risk_engine import vaciar_coleccion  # noqa: E402


def main() -> None:
    eliminados = vaciar_coleccion()
    print(f"ChromaDB vaciada: {eliminados} registro(s) eliminado(s).")


if __name__ == "__main__":
    main()
