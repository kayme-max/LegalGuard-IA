# app/repositories/risk_repository.py
"""Repositorio CRUD para la tabla base_conocimiento_riesgos."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from psycopg2.extras import RealDictCursor

from app.services.database import get_connection

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Lectura
# ─────────────────────────────────────────────

def obtener_todos(solo_activos: bool = True) -> List[Dict[str, Any]]:
    """Devuelve todos los registros de base_conocimiento_riesgos."""
    filtro = "WHERE activo = TRUE" if solo_activos else ""
    query = f"""
        SELECT id, riesgo_id, sector, tipo_contrato, categoria, subcategoria,
               riesgo_identificado, foco_revision, nombre_archivo_licitacion,
               seccion_bases, pagina_pdf, nombre_archivo_normativa,
               contexto_parrafo, evidencia_licitacion, sustento_legal_normativo,
               fragmento_literal_fuente, created_at, updated_at, activo
        FROM base_conocimiento_riesgos
        {filtro}
        ORDER BY id ASC;
    """
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query)
                return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        logger.error("Error al obtener registros de base_conocimiento_riesgos: %s", e)
        return []


def obtener_por_id(id: int) -> Optional[Dict[str, Any]]:
    """Devuelve un registro por su PK."""
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM base_conocimiento_riesgos WHERE id = %s",
                    (id,)
                )
                row = cur.fetchone()
                return dict(row) if row else None
    except Exception as e:
        logger.error("Error al obtener registro id=%s: %s", id, e)
        return None


def buscar_por_sector_y_tipo(
    sector: str,
    tipo_contrato: Optional[str] = None,
    solo_activos: bool = True,
) -> List[Dict[str, Any]]:
    """Filtra por sector y opcionalmente por tipo_contrato."""
    params: list = [f"%{sector}%"]
    filtro_tipo = ""

    if tipo_contrato:
        filtro_tipo = "AND tipo_contrato ILIKE %s"
        params.append(f"%{tipo_contrato}%")

    filtro_activo = "AND activo = TRUE" if solo_activos else ""

    query = f"""
        SELECT id, riesgo_id, sector, tipo_contrato, categoria, subcategoria,
               riesgo_identificado, foco_revision, nombre_archivo_licitacion,
               seccion_bases, pagina_pdf, nombre_archivo_normativa,
               contexto_parrafo, evidencia_licitacion, sustento_legal_normativo,
               fragmento_literal_fuente, created_at, updated_at, activo
        FROM base_conocimiento_riesgos
        WHERE (sector IS NULL OR sector ILIKE %s)
          {filtro_tipo}
          {filtro_activo}
        ORDER BY id ASC;
    """
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        logger.error("Error al buscar por sector '%s': %s", sector, e)
        return []


# ─────────────────────────────────────────────
# Escritura
# ─────────────────────────────────────────────

def crear(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Inserta un nuevo registro y devuelve el row creado."""
    query = """
        INSERT INTO base_conocimiento_riesgos (
            riesgo_id, sector, tipo_contrato, categoria, subcategoria,
            riesgo_identificado, foco_revision, nombre_archivo_licitacion,
            seccion_bases, pagina_pdf, nombre_archivo_normativa,
            contexto_parrafo, evidencia_licitacion, sustento_legal_normativo,
            fragmento_literal_fuente, activo
        )
        VALUES (
            %(riesgo_id)s, %(sector)s, %(tipo_contrato)s, %(categoria)s, %(subcategoria)s,
            %(riesgo_identificado)s, %(foco_revision)s, %(nombre_archivo_licitacion)s,
            %(seccion_bases)s, %(pagina_pdf)s, %(nombre_archivo_normativa)s,
            %(contexto_parrafo)s, %(evidencia_licitacion)s, %(sustento_legal_normativo)s,
            %(fragmento_literal_fuente)s, %(activo)s
        )
        RETURNING id;
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, {
                    "riesgo_id":                 data.get("riesgo_id"),
                    "sector":                    data.get("sector"),
                    "tipo_contrato":             data.get("tipo_contrato"),
                    "categoria":                 data.get("categoria"),
                    "subcategoria":              data.get("subcategoria"),
                    "riesgo_identificado":       data.get("riesgo_identificado"),
                    "foco_revision":             data.get("foco_revision"),
                    "nombre_archivo_licitacion": data.get("nombre_archivo_licitacion"),
                    "seccion_bases":             data.get("seccion_bases"),
                    "pagina_pdf":                data.get("pagina_pdf"),
                    "nombre_archivo_normativa":  data.get("nombre_archivo_normativa"),
                    "contexto_parrafo":          data.get("contexto_parrafo"),
                    "evidencia_licitacion":      data.get("evidencia_licitacion"),
                    "sustento_legal_normativo":  data.get("sustento_legal_normativo"),
                    "fragmento_literal_fuente":  data.get("fragmento_literal_fuente"),
                    "activo":                    data.get("activo", True),
                })
                new_id = cur.fetchone()[0]
            conn.commit()
        return obtener_por_id(new_id)
    except Exception as e:
        logger.error("Error al crear registro en base_conocimiento_riesgos: %s", e)
        return None


def actualizar(id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Actualiza campos enviados (PATCH parcial) y devuelve el row actualizado."""
    campos_permitidos = {
        "riesgo_id", "sector", "tipo_contrato", "categoria", "subcategoria",
        "riesgo_identificado", "foco_revision", "nombre_archivo_licitacion",
        "seccion_bases", "pagina_pdf", "nombre_archivo_normativa",
        "contexto_parrafo", "evidencia_licitacion", "sustento_legal_normativo",
        "fragmento_literal_fuente", "activo",
    }
    campos = {k: v for k, v in data.items() if k in campos_permitidos}

    if not campos:
        logger.warning("actualizar() llamado sin campos válidos para id=%s", id)
        return obtener_por_id(id)

    set_clause = ", ".join(f"{col} = %({col})s" for col in campos)
    campos["id"] = id

    query = f"""
        UPDATE base_conocimiento_riesgos
        SET {set_clause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = %(id)s;
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, campos)
            conn.commit()
        return obtener_por_id(id)
    except Exception as e:
        logger.error("Error al actualizar registro id=%s: %s", id, e)
        return None


def desactivar(id: int) -> bool:
    """Soft-delete: marca activo = FALSE en lugar de eliminar."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE base_conocimiento_riesgos SET activo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (id,)
                )
            conn.commit()
        return True
    except Exception as e:
        logger.error("Error al desactivar registro id=%s: %s", id, e)
        return False