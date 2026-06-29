from __future__ import annotations

import json
import uuid
import traceback
from datetime import date, datetime, timezone
from typing import Any, Dict, Optional

from app.services.campos_estandar import (
    extraer_trazabilidad_desde_riesgo,
    leer_nombre_archivo_licitacion,
    leer_tipo_contrato,
    normalizar_payload_analisis,
    normalizar_riesgo,
)
from app.services.database import get_connection


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _parse_fecha(val: Any) -> Optional[date]:
    if val is None:
        return None
    try:
        return date.fromisoformat(str(val))
    except (ValueError, TypeError):
        return None


def _deduplicar_riesgos(riesgos: list) -> list:
    vistos: set = set()
    resultado = []
    for r in riesgos:
        key = r.get("riesgo_id") or r.get("numero_riesgo")
        if key not in vistos:
            vistos.add(key)
            resultado.append(r)
    return resultado

def _mapear_nivel_sustento(val: Any) -> str:
    """Normaliza criticidad/nivel_sustento al valor aceptado por el CHECK de la BD."""
    MAPA = {
        "alta":  "ALTO",
        "alto":  "ALTO",
        "media": "MEDIO",
        "medio": "MEDIO",
        "baja":  "BAJO",
        "bajo":  "BAJO",
        "muy baja": "BAJO",
        "muy bajo": "BAJO",
    }
    if not val:
        return "MEDIO"
    return MAPA.get(str(val).lower(), str(val).upper())

# ─────────────────────────────────────────────
# Guardar
# ─────────────────────────────────────────────

def guardar_informe(payload: Dict[str, Any]) -> str:
    payload = normalizar_payload_analisis(payload)
    id_analisis = str(uuid.uuid4())

    conn = get_connection()
    cur = conn.cursor()

    try:
        resultado = payload.get("resultado") or {}
        riesgos = _deduplicar_riesgos(resultado.get("riesgos_detectados") or [])

        # 1. Tabla principal: analisis
        cur.execute(
            """
            INSERT INTO analisis (
                id_analisis,
                nombre_archivo_licitacion,
                tipo_contrato,
                sector,
                origen_data,
                status,
                mensaje,
                resumen_ejecutivo,
                url_descarga_pdf,
                url_descarga_excel,
                fecha_creacion
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                id_analisis,
                leer_nombre_archivo_licitacion(payload),
                leer_tipo_contrato(payload),
                payload.get("sector"),
                payload.get("origen_data"),
                payload.get("status"),
                payload.get("mensaje"),
                resultado.get("resumen_ejecutivo"),
                f"/descargar-informe/{id_analisis}",
                f"/descargar-excel/{id_analisis}",
                datetime.now(timezone.utc)
            )
        )

        # 2. Normativas cargadas
        for normativa in payload.get("normativas_cargadas") or []:
            if normativa:
                cur.execute(
                    "INSERT INTO analisis_normativas (id_analisis, nombre_archivo) VALUES (%s,%s)",
                    (id_analisis, normativa),
                )

        # 3. Riesgos — todo en una sola tabla
        for riesgo_raw in riesgos:
            riesgo = normalizar_riesgo(riesgo_raw)

            # ── IDs y clasificación (vienen del orquestador en riesgo_raw) ──
            id_del_riesgo     = riesgo_raw.get("numero_riesgo") or riesgo_raw.get("riesgo_id") or f"OXI-{str(riesgos.index(riesgo_raw)+1).zfill(5)}"
            sector_analisis   = payload.get("sector")        or riesgo_raw.get("sector")
            contrato_analisis = payload.get("tipo_contrato") or riesgo_raw.get("tipo_contrato")
            categoria_analisis    = payload.get("categoria")    or riesgo_raw.get("categoria")
            subcategoria_analisis = payload.get("subcategoria") or riesgo_raw.get("subcategoria")

            # 🔥 ── Lógica de Reskate para Normativa ── 🔥
            normativas_globales = payload.get("normativas_cargadas") or []
            archivo_norma_final = riesgo_raw.get("nombre_archivo_normativa")
            if not archivo_norma_final and normativas_globales:
                archivo_norma_final = normativas_globales[0]

            # ── 🚀 SOLUCIÓN AL ERROR DE SINTAXIS JSONB ──
            # Almacenamos las listas nativas formateadas como strings de JSON válidos válidos para la BD.
            precision_detalle_json = json.dumps(riesgo_raw.get("precision_detalle") or [])
            referencias_no_localizadas_json = json.dumps(riesgo_raw.get("referencias_no_localizadas") or [])

            # ── Trazabilidad ──
            traz_ev, traz_sus = extraer_trazabilidad_desde_riesgo(riesgo_raw)

            cur.execute(
                """
                INSERT INTO riesgos (
                    id_analisis,
                    riesgo_id,
                    sector,
                    tipo_contrato,
                    categoria,
                    subcategoria,
                    riesgo_identificado,
                    foco_revision,
                    nombre_archivo_licitacion,
                    seccion_bases,
                    pagina_pdf,
                    nombre_archivo_normativa,
                    contexto_parrafo,
                    evidencia_licitacion,
                    sustento_legal_normativo,
                    fragmento_literal_fuente,
                    nivel_sustento_documental,
                    alerta_sistema,
                    activo,
                    precision_detalle,
                    referencias_no_localizadas,
                    traz_ev_encontrado,
                    traz_ev_indice_caracter,
                    traz_ev_fragmento_literal,
                    traz_ev_patron_normalizado,
                    traz_ev_documento,
                    traz_ev_pagina_pdf,
                    traz_sus_encontrado,
                    traz_sus_motivo,
                    traz_sus_cita_evaluada,
                    traz_sus_cita_normalizada,
                    traz_sus_documento,
                    traz_sus_nombre_archivo_normativa
                )
                VALUES (
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s
                )
                """,
                (
                    id_analisis,
                    id_del_riesgo,
                    sector_analisis,
                    contrato_analisis,
                    categoria_analisis,
                    subcategoria_analisis,
                    riesgo_raw.get("riesgo_identificado"),
                    riesgo_raw.get("foco_revision"),
                    riesgo_raw.get("nombre_archivo_licitacion") or leer_nombre_archivo_licitacion(payload),
                    riesgo_raw.get("seccion_bases"),
                    riesgo_raw.get("pagina_pdf"),
                    archivo_norma_final,
                    riesgo_raw.get("contexto_parrafo"),
                    riesgo_raw.get("evidencia_licitacion"),
                    riesgo_raw.get("sustento_legal_normativo"),
                    riesgo_raw.get("fragmento_literal_fuente"),
                    _mapear_nivel_sustento(riesgo_raw.get("nivel_sustento_documental") or riesgo_raw.get("criticidad")),
                    riesgo_raw.get("alerta_sistema"),
                    riesgo_raw.get("activo", True),
                    precision_detalle_json,         # 👈 Inyección estructurada limpia
                    referencias_no_localizadas_json,# 👈 Inyección estructurada limpia
                    traz_ev.get("encontrado")                                     if traz_ev else None,
                    traz_ev.get("indice_aproximado_caracter")                     if traz_ev else None,
                    traz_ev.get("fragmento_literal_fuente")                       if traz_ev else None,
                    traz_ev.get("patron_coincidente_normalizado")                  if traz_ev else None,
                    traz_ev.get("documento")                                      if traz_ev else None,
                    traz_ev.get("pagina_pdf")                                     if traz_ev else None,
                    traz_sus.get("encontrado")                                    if traz_sus else None,
                    traz_sus.get("motivo")                                        if traz_sus else None,
                    traz_sus.get("cita_evaluada")                                 if traz_sus else None,
                    traz_sus.get("cita_normalizada_evaluada")                     if traz_sus else None,
                    traz_sus.get("documento")                                     if traz_sus else None,
                    traz_sus.get("nombre_archivo_normativa")                      if traz_sus else None,
                ),
            )

        conn.commit()
        return id_analisis

    except Exception:
        conn.rollback()
        traceback.print_exc()
        raise

    finally:
        cur.close()
        conn.close()


# ─────────────────────────────────────────────
# Obtener
# ─────────────────────────────────────────────

def obtener_informe(id_analisis: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT
                nombre_archivo_licitacion, tipo_contrato, sector,
                origen_data, status, mensaje, resumen_ejecutivo,
                url_descarga_pdf, url_descarga_excel
            FROM analisis
            WHERE id_analisis = %s
            """,
            (id_analisis,),
        )
        row = cur.fetchone()
        if not row:
            return None

        cols = [
            "nombre_archivo_licitacion", "tipo_contrato", "sector",
            "origen_data", "status", "mensaje", "resumen_ejecutivo",
            "url_descarga_pdf", "url_descarga_excel",
        ]
        base: Dict[str, Any] = dict(zip(cols, row))
        base["id_analisis"] = id_analisis

        cur.execute(
            "SELECT nombre_archivo FROM analisis_normativas WHERE id_analisis = %s",
            (id_analisis,),
        )
        base["normativas_cargadas"] = [r[0] for r in cur.fetchall()]

        # 🚨 REVISIÓN CRÍTICA DE ÍNDICES: Tu SELECT solicita 32 columnas mapeadas desde el índice 0 al 31.
        cur.execute(
            """
            SELECT
                riesgo_id, sector, tipo_contrato, categoria, subcategoria,                -- 0 a 4
                riesgo_identificado, foco_revision, nombre_archivo_licitacion,           -- 5 a 7
                seccion_bases, pagina_pdf, nombre_archivo_normativa, contexto_parrafo,   -- 8 a 11
                evidencia_licitacion, sustento_legal_normativo, fragmento_literal_fuente, -- 12 a 14
                nivel_sustento_documental, alerta_sistema, activo,                       -- 15 a 17
                precision_detalle, referencias_no_localizadas,                           -- 18 y 19
                traz_ev_encontrado, traz_ev_indice_caracter, traz_ev_fragmento_literal,   -- 20 a 22
                traz_ev_patron_normalizado, traz_ev_documento, traz_ev_pagina_pdf,       -- 23 a 25
                traz_sus_encontrado, traz_sus_motivo, traz_sus_cita_evaluada,            -- 26 a 28
                traz_sus_cita_normalizada, traz_sus_documento, traz_sus_nombre_archivo_normativa -- 29 a 31
            FROM riesgos
            WHERE id_analisis = %s
            ORDER BY riesgo_id
            """,
            (id_analisis,),
        )
        riesgo_rows = cur.fetchall()

        riesgos = []
        for r in riesgo_rows:
            # 🚀 RECONSTRUCCIÓN CORRECTA DESDE JSONB:
            # Dado que ahora guardamos arreglos JSON nativos, los extraemos limpiamente usando json.loads()
            # En tu consulta, precision_detalle está en el índice 18 y referencias_no_localizadas en el 19.
            try:
                precision_list = json.loads(r[18]) if r[18] else []
            except Exception:
                precision_list = [x.strip() for x in r[18].split("|")] if r[18] else []

            try:
                refs_list = json.loads(r[19]) if r[19] else []
            except Exception:
                refs_list = [x.strip() for x in r[19].split("|")] if r[19] else []

            riesgo: Dict[str, Any] = {
                "riesgo_id":                  r[1],
                "sector":                     r[1],
                "tipo_contrato":              r[2],
                "categoria":                  r[3],
                "subcategoria":               r[4],
                "riesgo_identificado":        r[5],
                "foco_revision":              r[6],
                "nombre_archivo_licitacion":  r[7],
                "seccion_bases":              r[8],
                "pagina_pdf":                 r[9],
                "nombre_archivo_normativa":   r[10],
                "contexto_parrafo":           r[11],
                "evidencia_licitacion":       r[12],
                "sustento_legal_normativo":   r[13],
                "fragmento_literal_fuente":   r[14],
                "nivel_sustento_documental":  r[15],
                "alerta_sistema":             r[16],
                "activo":                     r[17],
                "precision_detalle":          precision_list,
                "referencias_no_localizadas": refs_list,
                
                "trazabilidad_evidencia": {
                    "encontrado":                     r[20],
                    "indice_aproximado_caracter":     r[21],
                    "fragmento_literal_fuente":       r[22],
                    "patron_coincidente_normalizado": r[23],
                    "documento":                      r[24],
                    "pagina_pdf":                     r[25],
                } if r[20] is not None else None,
                "trazabilidad_sustento": {
                    "encontrado":                r[26],
                    "motivo":                    r[27],
                    "cita_evaluada":             r[28],
                    "cita_normalizada_evaluada": r[29],
                    "documento":                 r[30],
                    "nombre_archivo_normativa":  r[31],
                } if r[26] is not None else None,
            }
            riesgos.append(normalizar_riesgo(riesgo))

        resumen = base.pop("resumen_ejecutivo")
        base["resultado"] = {
            "resumen_ejecutivo": resumen,
            "riesgos_detectados": riesgos,
        }
        return normalizar_payload_analisis(base)

    except Exception:
        traceback.print_exc()
        raise

    finally:
        cur.close()
        conn.close()