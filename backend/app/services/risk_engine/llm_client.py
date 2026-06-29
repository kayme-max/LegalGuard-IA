"""Cliente LLM — exclusivamente Google Gemini."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any, Dict

from json_repair import repair_json

from app.services.risk_engine.config import MAX_REINTENTOS_LLM
from app.services.risk_engine.context_builder import preparar_textos_para_llm
from app.services.risk_engine.exceptions import LLMContextTooLargeError, LLMRateLimitError
from app.services.campos_estandar import normalizar_resultado
from app.services.informe_enricher import asegurar_resumen_ejecutivo
from app.services.risk_engine.middleware import aplicar_middleware_calidad
from app.services.risk_engine.prompts import PLANTILLA_PROMPT_USUARIO, SYSTEM_PROMPT

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Limpieza y parseo
# ─────────────────────────────────────────────────────────────────────────────

def _limpiar_markdown(texto: str) -> str:
    texto = texto.strip()
    if "```" in texto:
        bloque = re.search(r"```(?:json\s*)?(.*?)```", texto, re.DOTALL | re.IGNORECASE)
        if bloque:
            texto = bloque.group(1).strip()
        else:
            texto = texto.replace("```", "").strip()
    if texto.lower().startswith("json"):
        texto = texto[4:].strip()
    return texto


def _extraer_json_literal(texto: str) -> str | None:
    texto = _limpiar_markdown(texto)
    for inicio in range(len(texto)):
        if texto[inicio] not in "[{":
            continue
        profundidad = 0
        en_string = False
        escapando = False
        for indice, caracter in enumerate(texto[inicio:], start=inicio):
            if caracter == '"' and not escapando:
                en_string = not en_string
            if caracter == "\\" and not escapando:
                escapando = True
                continue
            escapando = False
            if en_string:
                continue
            if caracter in "[{":
                profundidad += 1
            elif caracter in "]}":
                if profundidad > 0:
                    profundidad -= 1
                    if profundidad == 0:
                        return texto[inicio: indice + 1]
    return None


def parsear_respuesta_llm(contenido: str) -> Dict[str, Any]:
    texto = _limpiar_markdown(contenido)
    try:
        payload = json.loads(texto)
    except json.JSONDecodeError as exc:
        try:
            payload = json.loads(repair_json(texto))
        except Exception as reparo_exc:
            candidato = _extraer_json_literal(texto)
            if candidato:
                try:
                    payload = json.loads(candidato)
                except json.JSONDecodeError:
                    raise ValueError(
                        f"Gemini no devolvió JSON válido: {exc}. "
                        f"Reparación fallida: {reparo_exc}. "
                        f"Texto (primeros 500 chars): {texto[:500]!r}"
                    ) from exc
            else:
                raise ValueError(
                    f"Gemini no devolvió JSON válido: {exc}. "
                    f"Reparación fallida: {reparo_exc}. "
                    f"Texto (primeros 500 chars): {texto[:500]!r}"
                ) from exc

    if "riesgos_detectados" in payload:
        return payload
    if isinstance(payload.get("resultado"), dict):
        return payload["resultado"]
    return payload


# ─────────────────────────────────────────────────────────────────────────────
# Construcción del prompt
# ─────────────────────────────────────────────────────────────────────────────

def construir_prompt_usuario(
    texto_licitacion: str,
    texto_normativas: str,
    proyecto: str,
    sector: str,
    modalidad_ejecucion: str = "EPC",
    es_reintento: bool = False,
    instrucciones_ia: str | None = None,
    riesgos_contexto: list | None = None,
    matriz_legal_json: str = "",
    matriz_oxi_json: str = "",
) -> str:
    bloque_normativas = (
        texto_normativas if texto_normativas.strip()
        else "[Sin normativa adjunta en esta sesión.]"
    )
    bloque_legal = matriz_legal_json.strip() or "[Sin datos de matriz legal cargados en esta sesión.]"
    bloque_oxi   = matriz_oxi_json.strip()   or "[Sin datos de matriz OXI cargados en esta sesión.]"

    bloque_matriz = ""
    if instrucciones_ia:
        bloque_matriz = f"{instrucciones_ia}\n\nFOCO DE REVISIÓN POR RIESGO:\n"
        if riesgos_contexto:
            for r in riesgos_contexto:
                bloque_matriz += f"  • {r.get('riesgo_especifico', '')} → {r.get('foco_revision', '')}\n"

    prompt = PLANTILLA_PROMPT_USUARIO.format(
        tipo_contrato=proyecto,
        modalidad_ejecucion=modalidad_ejecucion,
        sector=sector,
        texto_licitacion=texto_licitacion,
        texto_normativas=bloque_normativas,
        matriz_legal_json=bloque_legal,
        matriz_oxi_json=bloque_oxi,
    )

    if bloque_matriz:
        prompt += f"\n\n{bloque_matriz}"

    if es_reintento:
        prompt += (
            "\n\n[REINTENTO — SIN HALLAZGOS EN RESPUESTA PREVIA]\n"
            "Regenera el JSON con riesgos contractuales reales y citas literales copiadas "
            "de los textos adjuntos.\n"
            'Si no hay sustento literal, devuelve "riesgos_detectados": [].'
        )

    return prompt


# ─────────────────────────────────────────────────────────────────────────────
# Invocación Gemini
# ─────────────────────────────────────────────────────────────────────────────

async def invocar_llm(system_prompt: str, user_prompt: str) -> str:
    """Punto de entrada único — llama a Gemini."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY no está configurada en el entorno.")

    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise RuntimeError("Instala google-genai: pip install google-genai") from exc

    model  = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
    client = genai.Client(api_key=api_key)

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.3,
        max_output_tokens=65536,
        system_instruction=system_prompt,
    )

    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=model,
            contents=f"{system_prompt}\n\n{user_prompt}",
            config=config,
        )

        texto = response.text.strip()
        if texto.startswith("```"):
            partes = texto.split("```")
            texto  = partes[1] if len(partes) > 1 else texto
            if texto.startswith("json"):
                texto = texto[4:]
        return texto.strip()

    except Exception as exc:
        mensaje = str(exc).lower()
        if "object has no attribute" in mensaje:
            logger.error("Error interno del SDK de Gemini: %s", exc)
            raise
        if "429" in mensaje or "quota" in mensaje or "rate" in mensaje:
            raise LLMRateLimitError(
                mensaje=f"Límite de Gemini alcanzado: {exc}",
                proveedor="gemini",
            ) from exc
        if "413" in mensaje or "too large" in mensaje:
            raise LLMContextTooLargeError(
                mensaje=f"Payload demasiado grande para Gemini: {exc}",
                proveedor="gemini",
            ) from exc
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Flujo principal con reintentos
# ─────────────────────────────────────────────────────────────────────────────

async def analizar_con_validacion(
    texto_licitacion: str,
    texto_normativas: str,
    proyecto: str,
    sector: str,
    requiere_normativa: bool,
    modalidad_ejecucion: str = "EPC",
    instrucciones_ia: str | None = None,
    riesgos_contexto: list | None = None,
    matriz_legal_json: str = "",
    matriz_oxi_json: str = "",
) -> Dict[str, Any]:
    """Invoca Gemini y aplica middleware de calidad. Reintenta si no hay hallazgos."""
    ultimo_resultado: Dict[str, Any] = {"riesgos_detectados": []}

    lic_llm, norm_llm, meta_contexto = preparar_textos_para_llm(
        texto_licitacion, texto_normativas, proyecto, sector
    )

    for intento in range(MAX_REINTENTOS_LLM):
        prompt_usuario = construir_prompt_usuario(
            lic_llm,
            norm_llm,
            proyecto,
            sector,
            modalidad_ejecucion=modalidad_ejecucion,
            es_reintento=intento > 0,
            instrucciones_ia=instrucciones_ia,
            riesgos_contexto=riesgos_contexto,
            matriz_legal_json=matriz_legal_json,
            matriz_oxi_json=matriz_oxi_json,
        )

        try:
            raw_response = await invocar_llm(SYSTEM_PROMPT, prompt_usuario)
            logger.info("Respuesta cruda Gemini (intento %d): %s…", intento, raw_response[:300])
            print(f"==== RESPUESTA CRUDA GEMINI (intento {intento}) ====")
            print(raw_response[:2000])
            crudo = parsear_respuesta_llm(raw_response)

        except LLMContextTooLargeError as exc:
            if intento == 0:
                logger.info("Payload grande; reintentando con textos completos.")
                lic_llm  = texto_licitacion
                norm_llm = texto_normativas
                continue
            logger.error("Intento %d: payload aún demasiado grande.", intento)
            raise

        calibrado = aplicar_middleware_calidad(
            crudo, texto_licitacion, texto_normativas, requiere_normativa
        )

        print("==== RESULTADO TRAS MIDDLEWARE ====")
        print(json.dumps(calibrado, indent=2, default=str)[:2000])

        if meta_contexto.get("licitacion_recortada") or meta_contexto.get("normativa_recortada"):
            calibrado["_meta_contexto_llm"] = meta_contexto

        calibrado    = asegurar_resumen_ejecutivo(calibrado, proyecto, sector)
        calibrado    = normalizar_resultado(calibrado)
        ultimo_resultado = calibrado

        if calibrado.get("riesgos_detectados"):
            return calibrado

        logger.warning("Intento %d/%d: sin hallazgos procesables.", intento + 1, MAX_REINTENTOS_LLM)

    return ultimo_resultado