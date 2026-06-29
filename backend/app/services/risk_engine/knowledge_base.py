"""Módulo de carga, normalización y filtrado unificado de matrices de riesgo desde PostgreSQL."""

from __future__ import annotations

import json
import logging
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ.get("DB_NAME", "db_ia_asistente")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASS = os.environ.get("DB_PASSWORD", "postgres")  # ← corregido: era DB_PASS, la var de entorno es DB_PASSWORD


def _obtener_conexion():
    """Crea y retorna una conexión a la base de datos PostgreSQL."""
    try:
        return psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
    except Exception as e:
        logger.error("Error crítico al conectar a la base de datos: %s", e)
        raise


def cargar_matrices_completas(proyecto: str, sector: str) -> tuple[str, str]:
    """
    Carga las matrices completas desde BD para inyectarlas directamente en el prompt del LLM.
    
    Mapeo de campos (tabla real → JSON del prompt):
      riesgo_id         → id
      categoria         → categoria
      subcategoria      → subcategoria
      riesgo_identificado → riesgo_especifico   (nombre que usa el LLM)
      foco_revision     → foco_revision
      tipo_contrato     → usado para separar en LEGAL vs OXI
    """
    query = """
        SELECT
            riesgo_id,
            sector,
            tipo_contrato,
            categoria,
            subcategoria,
            riesgo_identificado,
            foco_revision
        FROM base_conocimiento_riesgos
        WHERE activo = TRUE
        ORDER BY id ASC;
    """

    data_legal = {"RIESGOS_LEGAL": {"riesgos": []}}
    data_oxi   = {"RIESGOS_OXI":   {"riesgos": []}}

    try:
        with _obtener_conexion() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query)
                registros = cur.fetchall()

                for r in registros:
                    riesgo = {
                        "id":                r["riesgo_id"],
                        "categoria":         r["categoria"],
                        "subcategoria":      r["subcategoria"],
                        "riesgo_especifico": r["riesgo_identificado"],  # alias para el LLM
                        "foco_revision":     r["foco_revision"],
                    }

                    tipo = (r["tipo_contrato"] or "").upper()

                    # Separamos en dos matrices según tipo_contrato
                    if "OXI" in tipo or "29230" in tipo or "PÚBLICO" in tipo.upper():
                        data_oxi["RIESGOS_OXI"]["riesgos"].append(riesgo)
                    else:
                        # Todo lo demás va a LEGAL (EPC, obra pública, etc.)
                        data_legal["RIESGOS_LEGAL"]["riesgos"].append(riesgo)

    except Exception as e:
        logger.error("Error al cargar matrices completas desde BD: %s", e)

    logger.info(
        "Matrices cargadas — LEGAL: %d riesgos | OXI: %d riesgos",
        len(data_legal["RIESGOS_LEGAL"]["riesgos"]),
        len(data_oxi["RIESGOS_OXI"]["riesgos"]),
    )

    return (
        json.dumps(data_legal, indent=2, ensure_ascii=False),
        json.dumps(data_oxi,   indent=2, ensure_ascii=False),
    )


def filtrar_matriz_conocimiento(
    proyecto: str,
    sector: str,
    categorias: List[str],
) -> List[Dict[str, Any]]:
    """
    Construye una guía de revisión de alto nivel usando consultas SQL.
    Filtra por sector. Si se pasan categorías, filtra también por ellas.
    
    Retorna lista de dicts compatibles con el orchestrator:
      origen, id, categoria, subcategoria, riesgo_especifico, foco_revision
    """
    focos_reglas: List[Dict[str, Any]] = []

    # Construimos el WHERE dinámicamente según si se enviaron categorías
    filtro_categorias = ""
    params: list = [f"%{sector}%"]

    if categorias:
        placeholders = ", ".join(["%s"] * len(categorias))
        filtro_categorias = f"AND categoria ILIKE ANY(ARRAY[{placeholders}])"
        params.extend([f"%{cat}%" for cat in categorias])

    query = f"""
        SELECT
            riesgo_id,
            sector,
            tipo_contrato,
            categoria,
            subcategoria,
            riesgo_identificado,
            foco_revision
        FROM base_conocimiento_riesgos
        WHERE activo = TRUE
          AND (sector IS NULL OR sector ILIKE %s)
          {filtro_categorias}
        ORDER BY id ASC;
    """

    try:
        with _obtener_conexion() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                registros = cur.fetchall()

                for r in registros:
                    tipo = (r["tipo_contrato"] or "").upper()

                    if "OXI" in tipo or "29230" in tipo or "PÚBLICO" in tipo.upper():
                        origen = "MATRIZ_OXI_EXPERTA"
                    else:
                        origen = "MATRIZ_LEGAL"

                    focos_reglas.append({
                        "origen":            origen,
                        "id":                r["riesgo_id"],
                        "categoria":         (r["categoria"] or "").upper(),
                        "subcategoria":      r["subcategoria"],
                        "riesgo_especifico": r["riesgo_identificado"],  # alias para el orchestrator
                        "foco_revision":     r["foco_revision"],
                    })

        logger.info(
            "Filtrado de Base de Conocimiento exitoso. Total reglas cargadas: %d",
            len(focos_reglas),
        )

    except Exception as e:
        logger.error("Error al filtrar la matriz de conocimiento en BD: %s", e)

    return focos_reglas