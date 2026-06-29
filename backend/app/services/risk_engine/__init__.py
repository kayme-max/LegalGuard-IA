"""
Paquete RiskEngine — motor de riesgos legales modular.

Módulos:
  config         → constantes y rutas
  pdf_extractor  → extracción pypdf
  guardrail      → validación semántica de normativas
  trazabilidad   → mapeo exacto cita LLM ↔ PDF
  middleware     → calibración de criticidad y flags
  llm_client     → invocación LLM + reintentos
  chroma_store   → persistencia vectorial local
  orchestrator   → flujo principal
"""

from app.services.risk_engine.chroma_store import vaciar_coleccion
from app.services.risk_engine.exceptions import LLMContextTooLargeError, LLMRateLimitError
from app.services.risk_engine.orchestrator import analizar_documento_con_normativa
from app.services.risk_engine.text_normalizer import normalizar_texto_para_busqueda
from app.services.risk_engine.trazabilidad import mapear_trazabilidad_documento

__all__ = [
    "analizar_documento_con_normativa",
    "LLMContextTooLargeError",
    "LLMRateLimitError",
    "mapear_trazabilidad_documento",
    "normalizar_texto_para_busqueda",
    "vaciar_coleccion",
]
