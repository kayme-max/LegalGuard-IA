"""Normalización de nombres de campos al contrato canónico DB/frontend."""

from __future__ import annotations

from typing import Any, Dict, List, Optional


def _resolver(d: Dict[str, Any], *claves: str) -> Any:
    for clave in claves:
        if clave in d and d[clave] is not None:
            return d[clave]
    return None


def normalizar_bloque_trazabilidad(
    bloque: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    if not bloque or not isinstance(bloque, dict):
        return bloque

    out = dict(bloque)
    if "fragmento_literal_en_fuente" in out and "fragmento_literal_fuente" not in out:
        out["fragmento_literal_fuente"] = out.pop("fragmento_literal_en_fuente")
    out.pop("fragmento_literal_en_fuente", None)
    return out


def normalizar_trazabilidad(
    traz: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    if not traz or not isinstance(traz, dict):
        return traz

    out: Dict[str, Any] = {}
    evidencia = traz.get("evidencia_licitacion")
    if evidencia is not None:
        out["evidencia_licitacion"] = normalizar_bloque_trazabilidad(evidencia)

    sustento = traz.get("sustento_legal_normativo") or traz.get("sustento_legal")
    if sustento is not None:
        out["sustento_legal_normativo"] = normalizar_bloque_trazabilidad(sustento)

    if traz.get("nombre_archivo_normativa") is not None:
        out["nombre_archivo_normativa"] = traz["nombre_archivo_normativa"]

    return out


def extraer_trazabilidad_desde_riesgo(
    riesgo: Dict[str, Any],
) -> tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """Obtiene bloques de trazabilidad en formato plano para persistencia en BD."""
    traz = riesgo.get("trazabilidad") or {}
    if isinstance(traz, dict) and traz:
        evidencia = normalizar_bloque_trazabilidad(traz.get("evidencia_licitacion"))
        sustento = normalizar_bloque_trazabilidad(
            traz.get("sustento_legal_normativo") or traz.get("sustento_legal")
        )
        return evidencia, sustento

    evidencia = normalizar_bloque_trazabilidad(riesgo.get("trazabilidad_evidencia"))
    sustento = normalizar_bloque_trazabilidad(riesgo.get("trazabilidad_sustento"))
    return evidencia, sustento


def normalizar_riesgo(riesgo: Dict[str, Any], index: int = 0) -> Dict[str, Any]:
    """Normaliza el diccionario de riesgo a la nueva estructura de tabla única."""
    if not isinstance(riesgo, dict):
        return {}

    # Extraemos el ID considerando nombres legacy por seguridad
    id_riesgo = riesgo.get("riesgo_id") or riesgo.get("numero_riesgo") or f"OXI-{str(index+1).zfill(5)}"

    return {
        # Identificación
        "riesgo_id": id_riesgo,
        "sector": riesgo.get("sector"),
        "tipo_contrato": riesgo.get("tipo_contrato"),
        "categoria": riesgo.get("categoria"),
        "subcategoria": riesgo.get("subcategoria"),

        # Descripción
        "riesgo_identificado": riesgo.get("riesgo_identificado") or "NO DEFINIDO",
        "foco_revision": riesgo.get("foco_revision"),
        "nombre_archivo_licitacion": riesgo.get("nombre_archivo_licitacion"),
        "seccion_bases": riesgo.get("seccion_bases"),
        "pagina_pdf": riesgo.get("pagina_pdf"),

        # Trazabilidad documental
        "nombre_archivo_normativa": riesgo.get("nombre_archivo_normativa"),
        "contexto_parrafo": riesgo.get("contexto_parrafo"),
        "evidencia_licitacion": riesgo.get("evidencia_licitacion"),
        "sustento_legal_normativo": riesgo.get("sustento_legal_normativo"),
        "fragmento_literal_fuente": riesgo.get("fragmento_literal_fuente"),

        # Calidad y estado
        "nivel_sustento_documental": riesgo.get("nivel_sustento_documental"),
        "alerta_sistema": riesgo.get("alerta_sistema"),
        "activo": riesgo.get("activo", True),

        # Metadata adicional (Para enriquecer la respuesta del Frontend aunque no vaya a BD)
        "precision_score": riesgo.get("precision_score", 0),
        "precision_nivel": riesgo.get("precision_nivel", "NO EVALUADO"),
        "precision_detalle": riesgo.get("precision_detalle", []),
        "referencias_no_localizadas": riesgo.get("referencias_no_localizadas", []),
    }


def normalizar_lista_riesgos(riesgos: List[Any]) -> List[Any]:
    return [
        normalizar_riesgo(r, i) if isinstance(r, dict) else r
        for i, r in enumerate(riesgos)
    ]


def normalizar_resultado(resultado: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(resultado, dict):
        return resultado

    out = dict(resultado)
    metadata = out.get("metadata_analisis")
    if isinstance(metadata, dict):
        meta = dict(metadata)
        tipo = _resolver(meta, "tipo_contrato", "proyecto")
        if tipo is not None:
            meta["tipo_contrato"] = tipo
        meta.pop("proyecto", None)
        out["metadata_analisis"] = meta

    riesgos = out.get("riesgos_detectados")
    if isinstance(riesgos, list):
        out["riesgos_detectados"] = normalizar_lista_riesgos(riesgos)

    return out


def normalizar_payload_analisis(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Normaliza cabecera + resultado de un análisis para API/frontend."""
    if not isinstance(payload, dict):
        return payload

    out = dict(payload)

    nombre = _resolver(out, "nombre_archivo_licitacion", "archivo_licitacion")
    if nombre is not None:
        out["nombre_archivo_licitacion"] = nombre
    out.pop("archivo_licitacion", None)

    tipo = _resolver(out, "tipo_contrato", "proyecto")
    if tipo is not None:
        out["tipo_contrato"] = tipo
    out.pop("proyecto", None)

    resultado = out.get("resultado")
    if isinstance(resultado, dict):
        out["resultado"] = normalizar_resultado(resultado)
        meta = out["resultado"].get("metadata_analisis")
        if isinstance(meta, dict):
            if tipo is not None:
                meta.setdefault("tipo_contrato", tipo)
            if out.get("sector"):
                meta.setdefault("sector", out["sector"])

    return out


def leer_nombre_archivo_licitacion(payload: Dict[str, Any]) -> Optional[str]:
    return _resolver(payload, "nombre_archivo_licitacion", "archivo_licitacion")


def leer_tipo_contrato(payload: Dict[str, Any]) -> Optional[str]:
    return _resolver(payload, "tipo_contrato", "proyecto")