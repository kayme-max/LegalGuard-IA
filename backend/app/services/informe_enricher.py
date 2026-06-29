"""Enriquecimiento del resultado del análisis (resumen ejecutivo)."""

from __future__ import annotations

from typing import Any, Dict, List


def _contar_por_criticidad(riesgos: List[Dict[str, Any]]) -> Dict[str, int]:
    conteo = {"ALTA": 0, "MEDIA": 0, "BAJA": 0}
    for r in riesgos:
        crit = str(r.get("criticidad", "")).upper().strip()
        if crit in conteo:
            conteo[crit] += 1
    return conteo


def generar_resumen_ejecutivo_fallback(
    riesgos: List[Dict[str, Any]],
    proyecto: str,
    sector: str,
) -> str:
    """Genera resumen cuando el LLM no lo incluyó."""
    total = len(riesgos)
    if total == 0:
        return (
            f"Auditoría del proyecto '{proyecto}' (sector {sector}): no se identificaron "
            "riesgos contractuales con sustento textual en los documentos analizados. "
            "Se recomienda revisión humana complementaria antes de la postulación."
        )

    conteo = _contar_por_criticidad(riesgos)
    altas, medias, bajas = conteo["ALTA"], conteo["MEDIA"], conteo["BAJA"]
    validacion = sum(1 for r in riesgos if r.get("requiere_validacion_humana"))

    if altas >= 2:
        viabilidad = "viabilidad técnica condicionada con reservas severas"
    elif altas == 1 or medias >= 2:
        viabilidad = "viabilidad técnica condicionada"
    else:
        viabilidad = "viabilidad técnica relativamente favorable con observaciones puntuales"

    linea_validacion = ""
    if validacion:
        linea_validacion = (
            f" {validacion} hallazgo(s) requieren validación manual por especialista."
        )

    return (
        f"Auditoría '{proyecto}' ({sector}): se detectaron {total} riesgos "
        f"({altas} ALTA, {medias} MEDIA, {bajas} BAJA). "
        f"La evaluación global sugiere {viabilidad}.{linea_validacion}"
    )


def asegurar_resumen_ejecutivo(
    resultado: Dict[str, Any],
    proyecto: str = "",
    sector: str = "",
) -> Dict[str, Any]:
    """Garantiza 'resumen_ejecutivo' al inicio del objeto resultado."""
    if not isinstance(resultado, dict):
        return resultado

    resumen = str(resultado.get("resumen_ejecutivo", "")).strip()
    riesgos = resultado.get("riesgos_detectados") or []

    if not resumen:
        resultado["resumen_ejecutivo"] = generar_resumen_ejecutivo_fallback(
            riesgos, proyecto, sector
        )
    else:
        lineas = resumen.splitlines()
        if len(lineas) > 4:
            resultado["resumen_ejecutivo"] = "\n".join(lineas[:4])

    return resultado
