"""Middleware de calidad: trazabilidad + calibración de criticidad."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.services.risk_engine.config import ALERTA_VALIDACION_HUMANA
from app.services.risk_engine.trazabilidad import (
    es_frase_evasiva,
    mapear_trazabilidad_documento,
    referencias_normativas_inventadas,
)


def _es_vacio_contractual(evidencia: str) -> bool:
    return "[VACÍO CONTRACTUAL DETECTADO]" in evidencia.upper()

logger = logging.getLogger(__name__)


def flag_trazabilidad_encontrado(bloque: Optional[Dict[str, Any]]) -> bool:
    if bloque is None:
        return True
    return bloque.get("encontrado") is True


def enriquecer_riesgo_con_trazabilidad(
    riesgo: Dict[str, Any],
    texto_licitacion: str,
    texto_normativas: str,
    requiere_normativa: bool,
    # ── Nuevos parámetros de trazabilidad documental ──────────────────────
    pagina_pdf: Optional[int] = None,
    nombre_archivo_normativa: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    evidencia = str(riesgo.get("evidencia_licitacion", "")).strip()
    sustento = str(riesgo.get("sustento_legal_normativo", "")).strip()

    if es_frase_evasiva(evidencia) or es_frase_evasiva(sustento):
        logger.warning(
            "Hallazgo descartado por frase evasiva: %s",
            riesgo.get("riesgo_identificado", "sin nombre"),
        )
        return None

    # ── Resolver pagina_pdf y nombre_archivo_normativa ────────────────────
    # Prioridad: valor explícito pasado como argumento → campo del propio riesgo → None
    pagina_pdf_final = pagina_pdf if pagina_pdf is not None else riesgo.get("pagina_pdf")
    nombre_normativa_final = (
        nombre_archivo_normativa
        if nombre_archivo_normativa is not None
        else riesgo.get("nombre_archivo_normativa")
    )

    if _es_vacio_contractual(evidencia):
        ubicacion_lic = {
            "encontrado": True,
            "motivo": "Vacío contractual detectado por el modelo",
            "cita_evaluada": evidencia,
            "documento": "licitacion",
            # ── Trazabilidad documental ──
            "pagina_pdf": pagina_pdf_final,
        }
    else:
        ubicacion_lic = mapear_trazabilidad_documento(
            texto_licitacion, evidencia, "licitacion"
        )
        # Inyectar página PDF en el bloque de trazabilidad de licitación
        ubicacion_lic["pagina_pdf"] = pagina_pdf_final

    trazabilidad: Dict[str, Any] = {
        "evidencia_licitacion": ubicacion_lic,
        "sustento_legal_normativo": None,
        "nombre_archivo_normativa": nombre_normativa_final,
    }

    if requiere_normativa:
        if sustento:
            ubicacion_norm = mapear_trazabilidad_documento(
                texto_normativas, sustento, "normativa"
            )
            # Inyectar nombre de archivo normativa en el bloque de sustento
            ubicacion_norm["nombre_archivo_normativa"] = nombre_normativa_final
            refs_inventadas = referencias_normativas_inventadas(
                sustento, texto_normativas
            )
            if refs_inventadas:
                ubicacion_norm["referencias_no_localizadas"] = refs_inventadas[:5]
                ubicacion_norm["encontrado"] = False
                ubicacion_norm["motivo"] = (
                    "Referencias normativas no presentes en el PDF de soporte"
                )
            trazabilidad["sustento_legal_normativo"] = ubicacion_norm
        else:
            trazabilidad["sustento_legal_normativo"] = {
                "encontrado": False,
                "motivo": "Falta sustento_legal_normativo con normativa adjunta",
                "documento": "normativa",
                "nombre_archivo_normativa": nombre_normativa_final,
            }
    elif sustento:
        ubicacion_norm = mapear_trazabilidad_documento(
            texto_normativas or texto_licitacion, sustento, "normativa"
        )
        ubicacion_norm["nombre_archivo_normativa"] = nombre_normativa_final
        if not texto_normativas.strip():
            ubicacion_lic_alt = mapear_trazabilidad_documento(
                texto_licitacion, sustento, "licitacion"
            )
            if ubicacion_lic_alt.get("encontrado") is True:
                ubicacion_lic_alt["nombre_archivo_normativa"] = nombre_normativa_final
                ubicacion_norm = ubicacion_lic_alt
        trazabilidad["sustento_legal_normativo"] = ubicacion_norm

    riesgo_normalizado = {
        k: v
        for k, v in riesgo.items()
        if k not in ("sustento_legal", "fragmento_literal_en_fuente", "riesgo")
    }
    if sustento:
        riesgo_normalizado["sustento_legal_normativo"] = sustento

    return {**riesgo_normalizado, "trazabilidad": trazabilidad}


def calibrar_riesgo_por_trazabilidad(
    riesgo: Dict[str, Any],
    requiere_normativa: bool,
) -> Dict[str, Any]:
    trazabilidad = riesgo.get("trazabilidad") or {}
    evidencia_ok = flag_trazabilidad_encontrado(
        trazabilidad.get("evidencia_licitacion")
    )

    bloque_sustento = trazabilidad.get("sustento_legal_normativo")
    if requiere_normativa:
        sustento_ok = flag_trazabilidad_encontrado(bloque_sustento)
    else:
        sustento_ok = (
            True
            if bloque_sustento is None
            else flag_trazabilidad_encontrado(bloque_sustento)
        )

    if not evidencia_ok or not sustento_ok:
        riesgo["criticidad"] = "BAJA"
        riesgo["requiere_validacion_humana"] = True
        riesgo["alerta_sistema"] = ALERTA_VALIDACION_HUMANA
        logger.info(
            "Calibración BAJA + validación humana: %s",
            riesgo.get("riesgo_identificado", "sin nombre"),
        )
    else:
        riesgo["requiere_validacion_humana"] = False
        riesgo["alerta_sistema"] = None

    return riesgo


def aplicar_middleware_calidad(
    resultado: Dict[str, Any],
    texto_licitacion: str,
    texto_normativas: str,
    requiere_normativa: bool,
) -> Dict[str, Any]:
    riesgos: List[Any] = resultado.get("riesgos_detectados") or []
    procesados: List[Dict[str, Any]] = []
    descartados_evasivos: List[Dict[str, str]] = []

    for item in riesgos:
        if not isinstance(item, dict):
            continue

        # Los campos pagina_pdf y nombre_archivo_normativa vienen ya dentro
        # del propio riesgo (los genera el LLM); enriquecer_riesgo los recoge
        # automáticamente via riesgo.get(). No es necesario pasarlos a mano.
        enriquecido = enriquecer_riesgo_con_trazabilidad(
            item,
            texto_licitacion,
            texto_normativas,
            requiere_normativa,
        )
        if enriquecido is None:
            descartados_evasivos.append(
                {
                    "riesgo_identificado": str(
                        item.get("riesgo_identificado", "sin nombre")
                    ),
                    "motivo": "Respuesta evasiva del LLM",
                }
            )
            continue

        procesados.append(
            calcular_precision_score(
                calibrar_riesgo_por_trazabilidad(enriquecido, requiere_normativa)
            )
        )

    payload: Dict[str, Any] = {"riesgos_detectados": procesados}
    if descartados_evasivos:
        payload["riesgos_descartados_evasivos"] = descartados_evasivos
    return payload


def calcular_precision_score(riesgo: Dict[str, Any]) -> Dict[str, Any]:
    """Calcula score de precisión basado en criterios objetivos de trazabilidad."""
    trazabilidad = riesgo.get("trazabilidad", {})
    traz_lic = trazabilidad.get("evidencia_licitacion", {})
    traz_leg = trazabilidad.get("sustento_legal_normativo", {})

    score = 0
    detalle = []

    # Criterio 1: Fragmento literal encontrado en licitación (+40 pts)
    if traz_lic.get("encontrado") is True:
        score += 40
        detalle.append("✓ Evidencia literal localizada en licitación (+40)")
    else:
        detalle.append("✗ Evidencia no localizada en licitación (+0)")

    # Criterio 2: Sustento legal encontrado en normativa (+30 pts)
    # EXCEPCIÓN: Si es un vacío contractual detectado, otorgar puntos completos automaticamente
    es_vacio_contractual = _es_vacio_contractual(
        traz_lic.get("cita_evaluada") or traz_lic.get("motivo", "")
    )
    if es_vacio_contractual:
        score += 30
        detalle.append("✓ Omisión legal válida detectada; sustento automático (+30)")
    elif traz_leg.get("encontrado") is True:
        score += 30
        detalle.append("✓ Sustento legal localizado en normativa (+30)")
    else:
        detalle.append("✗ Sustento legal no localizado en normativa (+0)")

    # Criterio 3: Sin referencias normativas inventadas (+20 pts)
    # (se omite si es vacío contractual detectado, que no tiene referencias a verificar)
    if es_vacio_contractual:
        score += 20
        detalle.append("✓ Sin referencias normativas a verificar en omisión legal (+20)")
    else:
        refs_inventadas = traz_leg.get("referencias_no_localizadas", [])
        if not refs_inventadas:
            score += 20
            detalle.append("✓ Sin referencias normativas no verificadas (+20)")
        else:
            detalle.append(f"✗ {len(refs_inventadas)} referencia(s) no verificada(s) (+0)")

    # Criterio 4: No requiere validación humana (+10 pts)
    # (para vacíos contractuales detectados, el abogado debe revisar la omisión, pero no penaliza confianza)
    if not riesgo.get("requiere_validacion_humana"):
        score += 10
        detalle.append("✓ Trazabilidad completa, sin alerta de revisión (+10)")
    elif es_vacio_contractual:
        score += 10
        detalle.append("✓ Omisión legal requiere revisión abogado, pero es válida (+10)")
    else:
        detalle.append("✗ Requiere validación humana (+0)")

    # Nivel de confianza
    # Para vacíos contractuales, garantizar mínimo ALTA confianza (son hallazgos legales válidos)
    if es_vacio_contractual:
        nivel = "ALTA"
    elif score >= 90:
        nivel = "MUY ALTA"
    elif score >= 70:
        nivel = "ALTA"
    elif score >= 50:
        nivel = "MEDIA"
    elif score >= 30:
        nivel = "BAJA"
    else:
        nivel = "MUY BAJA"

    riesgo["precision_score"] = score
    riesgo["precision_nivel"] = nivel
    riesgo["precision_detalle"] = detalle
    # Flag para identificar hallazgos de omisión legal detectados
    if es_vacio_contractual:
        riesgo["es_vacio_contractual_detectado"] = True

    return riesgo