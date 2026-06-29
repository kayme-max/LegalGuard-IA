"""Orquestación del flujo completo del motor de riesgos."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.services.risk_engine.chroma_store import (
    consultar_analisis_persistido,
    persistir_analisis,
)
from app.services.risk_engine.guardrail import normativa_contiene_terminos_invalidos
from app.services.risk_engine.exceptions import LLMContextTooLargeError, LLMRateLimitError
from app.services.informe_enricher import asegurar_resumen_ejecutivo
from app.services.risk_engine.llm_client import analizar_con_validacion
from app.services.risk_engine.pdf_extractor import (
    extraer_texto_de_pdf,
    extraer_texto_de_pdfs,
)
# Importamos la función dinámica que lee la carpeta app/data/
from app.services.risk_engine.knowledge_base import (
    cargar_matrices_completas,
    filtrar_matriz_conocimiento,
)

logger = logging.getLogger(__name__)


async def analizar_documento_con_normativa(
    path_licitacion: str,
    paths_normativas: List[str],
    proyecto: str,
    sector: str,
    filename_licitacion: str,
    categorias_auditadas: List[str], # Recibe las categorías del desplegable multifiltro
) -> Dict[str, Any]:
    
    try:
        texto_licitacion = extraer_texto_de_pdf(path_licitacion)
        texto_normativas = extraer_texto_de_pdfs(paths_normativas)

        if not texto_licitacion:
            raise ValueError("No se pudo extraer texto del PDF de licitación.")

        # Guardrail de validación documental
        if paths_normativas and normativa_contiene_terminos_invalidos(texto_normativas):
            logger.warning("Guardrail activado: normativas no legales (%s)", filename_licitacion)
            respuesta = consultar_analisis_persistido(filename_licitacion, proyecto, sector)
            if isinstance(respuesta.get("datos"), dict):
                respuesta["datos"] = asegurar_resumen_ejecutivo(respuesta["datos"], proyecto, sector)
            return respuesta

# 1. PROCESAMIENTO DINÁMICO DE REGLAS CORPORATIVAS (Liberado para el Postor)
        categorias_auditadas = categorias_auditadas or []
        
        # Obtenemos las reglas filtradas para la directiva base
        focos_reglas = filtrar_matriz_conocimiento(proyecto, sector, categorias_auditadas)
        
        # 2. CONSTRUCCIÓN DEL PROMPT CONTEXTUAL MAESTRO
        instrucciones_ia = (
            "====== MANUAL DE AUDITORÍA CONTRALOR CORPORATIVO ======\n"
            "Actúas como un Abogado Consultor Senior Experto en Contrataciones e Inversiones de la Constructora.\n"
            "Tu objetivo es auditar las bases para identificar cláusulas abusivas, penalidades y vacíos de información.\n\n"
            "FASE 1: COMPROBACIÓN DE MATRICES DE RIESGO DE LA COMPAÑÍA\n"
            "Usa como base de conocimiento los dos archivos JSON provistos ('matriz_legal_json' y 'matriz_oxi_json'). "
            "Identifica si se activa cualquiera de los riesgos listados en ellos. Realiza un mapeo conceptual inteligente, "
            "homologando términos del sector público o privado según corresponda al documento.\n\n"
        )
        
        if focos_reglas:
            instrucciones_ia += "Prioriza la revisión de los siguientes focos críticos detectados para esta sesión:\n"
            for idx, f in enumerate(focos_reglas, 1):
                instrucciones_ia += f"- En '{f['foco_revision']}': Verificar riesgo '{f['riesgo_especifico']}'\n"

        # FASE 2: Inferencia libre para el Postor
        instrucciones_ia += f"""
        \nFASE 2: INFERENCIA DE CONTINGENCIAS Y VACÍOS CONTRACTUALES (NUEVOS RIESGOS)
        Considerando que el proyecto es de tipología '{proyecto.upper()}' y sector '{sector.upper()}', identifica CUALQUIER OTRO riesgo, vacío contractual o asimetría severa que perjudique a la constructora, aunque no esté explícito en las matrices JSON de referencia. Reporta estos hallazgos bajo el origen 'NUEVO_RIESGO'.
        
        REGLA DE SALIDA: Es obligatorio reportar los hallazgos críticos encontrados. Estructura tu respuesta estrictamente en el formato JSON solicitado por el cliente.
        """

        # =======================================================================
        # 🚀 LOG TEMPORAL DE ORQUESTACIÓN ACTUALIZADO
        # =======================================================================
        print("\n" + "═"*60)
        print("=== 🚀 PIPELINE ENGINE: TRANSMISIÓN DE CONTEXTO AL LLM ===")
        print(f" Tipología de Entrada  : {proyecto.upper()} | Sector: {sector.upper()}")
        print(f" Carga Útil de Matriz  : {len(focos_reglas)} reglas priorizadas")
        print(" Estado del Canal      : [READY] - Enviando contexto completo a Gemini 2.5-PRO...")
        print("═"*60 + "\n")

        requiere_normativa = bool(texto_normativas.strip())
        matriz_legal_json, matriz_oxi_json = cargar_matrices_completas(proyecto, sector)
        
        # 3. LLAMADA AL CLIENTE LLM CON ENLACES LIMPIOS
        resultado_llm = await analizar_con_validacion(
            texto_licitacion,
            texto_normativas,
            proyecto,
            sector,
            requiere_normativa,
            instrucciones_ia=instrucciones_ia,
            riesgos_contexto=focos_reglas,
            matriz_legal_json=matriz_legal_json,
            matriz_oxi_json=matriz_oxi_json,
        )

        # IMPRESIÓN DE CONTROL EXTRA: Ver qué devuelve el motor en la consola
        print("=== [DEBUG] RESPUESTA RECIBIDA EN EL ORQUESTRADOR ===")
        print(resultado_llm)
        print("=====================================================")

        # Mapeo flexible de llaves para evitar que Python descarte la respuesta si cambia el nombre del array
        riesgos = resultado_llm.get("riesgos_detectados") or resultado_llm.get("matriz_hallazgos_licitacion") or []

        if riesgos:
            persistir_analisis(filename_licitacion, proyecto, sector, resultado_llm)
        else:
            logger.warning("Sin hallazgos para %s; no se persiste en ChromaDB", filename_licitacion)

        return {
            "origen_data": "ARCHIVOS_NUEVOS",
            "datos": resultado_llm,
        }

    except (ValueError, LLMRateLimitError, LLMContextTooLargeError):
        raise
    except Exception as exc:
        logger.exception("Fallo en analizar_documento_con_normativa: %s", exc)
        raise RuntimeError(f"Fallo en el motor de análisis de riesgos: {exc}") from exc