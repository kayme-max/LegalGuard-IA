"""Constantes y rutas del motor de riesgos."""

from __future__ import annotations

from pathlib import Path
from typing import Final, Tuple

BACKEND_ROOT: Final[Path] = Path(__file__).resolve().parents[3]
CHROMA_PATH: Final[Path] = BACKEND_ROOT / "chroma_db_local"
COLLECTION_NAME: Final[str] = "licitaciones_riesgos"

TERMINOS_INVALIDOS_NORMATIVA: Final[Tuple[str, ...]] = (
    "xgboost",
    "shap",
    "modelos predictivos",
    "fintechs emergentes",
    "scoring",
)

MAX_REINTENTOS_LLM: Final[int] = 2

ALERTA_VALIDACION_HUMANA: Final[str] = (
    "Atención: El motor de IA identificó una posible contingencia conceptual, pero los "
    "fragmentos de texto exactos no pudieron ser localizados literalmente en los PDFs "
    "fuente. Se sugiere revisión por un abogado o especialista."
)

FRASES_EVASIVAS: Final[Tuple[str, ...]] = (
    "no se menciona",
    "no se ha encontrado",
    "se recomienda revisar",
    "no consta en el documento",
    "no aparece en el texto",
    "información no disponible",
)
