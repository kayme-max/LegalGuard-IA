"""
Generación de informe PDF corporativo con ReportLab.
Mapeo actualizado al esquema v2.0 de riesgos detectados.
"""

from __future__ import annotations

from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Paleta corporativa institucional
AZUL_OSCURO   = colors.HexColor("#1a365d")
GRIS_TEXTO    = colors.HexColor("#475569")
GRIS_CLARO    = colors.HexColor("#f1f5f9")
GRIS_BORDE    = colors.HexColor("#cbd5e1")
ROJO_ALERTA   = colors.HexColor("#b91c1c")
NARANJA_AVISO = colors.HexColor("#c2410c")
VERDE_OK      = colors.HexColor("#15803d")
AMARILLO_MED  = colors.HexColor("#b45309")
AZUL_CLARO    = colors.HexColor("#eff6ff")
AZUL_FICHA    = colors.HexColor("#1d4ed8")

# Colores por criticidad
_COLOR_CRITICIDAD = {
    "ALTA":  ROJO_ALERTA,
    "MEDIA": NARANJA_AVISO,
    "BAJA":  AZUL_OSCURO,
}

# Colores por tipo de riesgo (badge)
_COLOR_TIPO = {
    "LEGAL":          colors.HexColor("#6d28d9"),
    "CONTRACTUAL":    colors.HexColor("#b91c1c"),
    "TECNICO":        colors.HexColor("#0369a1"),
    "ADMINISTRATIVO": colors.HexColor("#c2410c"),
    "PROCEDIMENTAL":  colors.HexColor("#065f46"),
}


def _esc(texto: Any) -> str:
    """Escapa caracteres especiales para ReportLab."""
    return escape(str(texto or "")).replace("\n", "<br/>")


def _estilos() -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "titulo": ParagraphStyle(
            "TituloInforme", parent=base["Heading1"],
            fontSize=16, leading=20, textColor=AZUL_OSCURO,
            alignment=TA_CENTER, spaceAfter=14, fontName="Helvetica-Bold",
        ),
        "subtitulo": ParagraphStyle(
            "Subtitulo", parent=base["Normal"],
            fontSize=10, textColor=GRIS_TEXTO,
            alignment=TA_CENTER, spaceAfter=20,
        ),
        "seccion": ParagraphStyle(
            "Seccion", parent=base["Heading2"],
            fontSize=12, leading=15, textColor=AZUL_OSCURO,
            spaceBefore=16, spaceAfter=8, fontName="Helvetica-Bold",
        ),
        "cuerpo": ParagraphStyle(
            "Cuerpo", parent=base["Normal"],
            fontSize=9, leading=13, textColor=GRIS_TEXTO, alignment=TA_JUSTIFY,
        ),
        "etiqueta": ParagraphStyle(
            "Etiqueta", parent=base["Normal"],
            fontSize=8, textColor=AZUL_OSCURO,
            fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=2,
        ),
        "riesgo_titulo": ParagraphStyle(
            "RiesgoTitulo", parent=base["Heading3"],
            fontSize=11, leading=14, textColor=AZUL_OSCURO,
            fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=4,
        ),
        "evidencia": ParagraphStyle(
            "Evidencia", parent=base["Normal"],
            fontSize=8.5, leading=12, textColor=GRIS_TEXTO, alignment=TA_JUSTIFY,
        ),
        "contexto": ParagraphStyle(
            "Contexto", parent=base["Normal"],
            fontSize=8.5, leading=12, textColor=AZUL_OSCURO,
            alignment=TA_JUSTIFY, fontName="Helvetica-Oblique",
        ),
        "meta_trazabilidad": ParagraphStyle(
            "MetaTrazabilidad", parent=base["Normal"],
            fontSize=8, textColor=colors.HexColor("#1d4ed8"),
            fontName="Helvetica-BoldOblique", spaceBefore=2, spaceAfter=2,
        ),
        "resumen": ParagraphStyle(
            "Resumen", parent=base["Normal"],
            fontSize=10, leading=14, textColor=AZUL_OSCURO, alignment=TA_JUSTIFY,
        ),
        "aviso": ParagraphStyle(
            "Aviso", parent=base["Normal"],
            fontSize=9, leading=12, textColor=NARANJA_AVISO,
            fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=4,
        ),
        "observacion": ParagraphStyle(
            "Observacion", parent=base["Normal"],
            fontSize=8.5, leading=12,
            textColor=colors.HexColor("#1e3a5f"),
            alignment=TA_JUSTIFY,
            fontName="Helvetica-Oblique",
        ),
        "ficha_campo": ParagraphStyle(
            "FichaCampo", parent=base["Normal"],
            fontSize=8, textColor=AZUL_OSCURO,
            fontName="Helvetica-Bold",
        ),
        "ficha_valor": ParagraphStyle(
            "FichaValor", parent=base["Normal"],
            fontSize=8, textColor=GRIS_TEXTO,
        ),
        "plazo": ParagraphStyle(
            "Plazo", parent=base["Normal"],
            fontSize=8, textColor=NARANJA_AVISO,
            fontName="Helvetica-Bold",
        ),
    }


# ---------------------------------------------------------------------------
# Tabla de metadatos del encabezado
# ---------------------------------------------------------------------------

def _tabla_metadatos(data: Dict[str, Any], estilos: Dict[str, ParagraphStyle]) -> Table:
    fecha = data.get("fecha_emision") or datetime.now().strftime("%d/%m/%Y %H:%M")
    if "T" in str(fecha):
        try:
            fecha = datetime.fromisoformat(str(fecha).replace("Z", "+00:00")).strftime(
                "%d/%m/%Y %H:%M UTC"
            )
        except ValueError:
            pass

    resultado = data.get("resultado") or {}
    metadata  = resultado.get("metadata_analisis") or {}

    filas = [
        ["Licitación",          data.get("nombre_archivo_licitacion", "N/D")],
        ["Tipo de contrato",    f"{data.get('tipo_contrato', 'N/D')} — {metadata.get('modalidad_ejecucion', 'N/D')}"],
        ["Sector",              data.get("sector", "N/D")],
        ["Total de riesgos",    str(metadata.get("total_riesgos_detectados", "N/D"))],
        ["Estado del análisis", data.get("status", "N/D")],
        ["Fecha de emisión",    fecha],
    ]
    tabla = Table(filas, colWidths=[4.5 * cm, 12.0 * cm])
    tabla.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (0, -1), GRIS_CLARO),
        ("TEXTCOLOR",    (0, 0), (0, -1), AZUL_OSCURO),
        ("FONTNAME",     (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, -1), 9),
        ("TEXTCOLOR",    (1, 0), (1, -1), GRIS_TEXTO),
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("GRID",         (0, 0), (-1, -1), 0.5, GRIS_BORDE),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    return tabla


# ---------------------------------------------------------------------------
# Tabla de distribución de riesgos (metadata_analisis)
# ---------------------------------------------------------------------------

def _tabla_distribucion(metadata: Dict[str, Any], estilos: Dict[str, ParagraphStyle]) -> List[Any]:
    dist_tipo = metadata.get("distribucion_por_tipo") or {}
    dist_crit = metadata.get("distribucion_por_criticidad") or {}

    if not dist_tipo and not dist_crit:
        return []

    encabezado_tipo = [
        Paragraph("<b>Tipo</b>", estilos["etiqueta"]),
        Paragraph("<b>Cantidad</b>", estilos["etiqueta"]),
    ]
    filas_tipo = [encabezado_tipo] + [
        [Paragraph(_esc(k), estilos["cuerpo"]), Paragraph(_esc(v), estilos["cuerpo"])]
        for k, v in dist_tipo.items()
    ]

    encabezado_crit = [
        Paragraph("<b>Criticidad</b>", estilos["etiqueta"]),
        Paragraph("<b>Cantidad</b>", estilos["etiqueta"]),
    ]
    filas_crit = [encabezado_crit] + [
        [Paragraph(_esc(k), estilos["cuerpo"]), Paragraph(_esc(v), estilos["cuerpo"])]
        for k, v in dist_crit.items()
    ]

    estilo_tabla = TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0), AZUL_OSCURO),
        ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [GRIS_CLARO, colors.white]),
        ("GRID",         (0, 0), (-1, -1), 0.4, GRIS_BORDE),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
    ])

    t_tipo = Table(filas_tipo, colWidths=[5.5 * cm, 2.5 * cm])
    t_tipo.setStyle(estilo_tabla)

    t_crit = Table(filas_crit, colWidths=[5.5 * cm, 2.5 * cm])
    t_crit.setStyle(estilo_tabla)

    contenedor = Table([[t_tipo, Spacer(1 * cm, 1), t_crit]], colWidths=[8.5 * cm, 1 * cm, 8.5 * cm])
    contenedor.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))

    return [
        Paragraph("Distribución de riesgos detectados", estilos["seccion"]),
        contenedor,
        Spacer(1, 0.4 * cm),
    ]


# ---------------------------------------------------------------------------
# Bloque de resumen ejecutivo
# ---------------------------------------------------------------------------

def _bloque_resumen(resultado: Dict[str, Any], estilos: Dict[str, ParagraphStyle]) -> List[Any]:
    texto_resumen = (
        resultado.get("analisis_macro_viabilidad")
        or resultado.get("resumen_ejecutivo")
        or "Sin resumen disponible."
    )
    contenido = Table(
        [[Paragraph(_esc(texto_resumen), estilos["resumen"])]],
        colWidths=[16.5 * cm],
    )
    contenido.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), GRIS_CLARO),
        ("BOX",          (0, 0), (-1, -1), 1, AZUL_OSCURO),
        ("LEFTPADDING",  (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING",   (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 10),
    ]))
    return [
        Paragraph("1. Resumen Ejecutivo / Análisis de Viabilidad", estilos["seccion"]),
        contenido,
        Spacer(1, 0.4 * cm),
    ]


# ---------------------------------------------------------------------------
# Ficha de campos nuevos (auditoría legal independiente)
# ---------------------------------------------------------------------------

def _ficha_auditoria_legal(
    riesgo: Dict[str, Any],
    estilos: Dict[str, ParagraphStyle],
) -> List[Any]:
    """
    Devuelve una tabla compacta con los campos nuevos requeridos para
    auditoría legal independiente: página PDF, archivo normativa,
    número de observación, plazo límite y contexto del párrafo.
    """
    traz    = riesgo.get("trazabilidad") or {}
    traz_l  = traz.get("evidencia_licitacion") or {}
    traz_n  = traz.get("sustento_legal_normativo") or {}

    pagina_pdf       = riesgo.get("pagina_pdf") or traz_l.get("pagina_pdf") or "—"
    nombre_normativa = (
        riesgo.get("nombre_archivo_normativa")
        or traz.get("nombre_archivo_normativa")
        or traz_n.get("nombre_archivo_normativa")
        or "—"
    )
    num_obs      = riesgo.get("numero_observacion") or "—"
    plazo_limite = riesgo.get("plazo_limite") or "—"
    contexto     = riesgo.get("contexto_parrafo") or ""

    # Fila superior: 4 campos en línea
    fila_meta = Table(
        [[
            Paragraph(f"<b>Pág. PDF:</b> {_esc(pagina_pdf)}", estilos["ficha_campo"]),
            Paragraph(f"<b>Normativa:</b> {_esc(nombre_normativa)}", estilos["ficha_campo"]),
            Paragraph(f"<b>N° Obs.:</b> {_esc(num_obs)}", estilos["ficha_campo"]),
            Paragraph(
                f"<b>Plazo límite:</b> {_esc(plazo_limite)}",
                estilos["plazo"] if plazo_limite != "—" else estilos["ficha_campo"],
            ),
        ]],
        colWidths=[3.5 * cm, 5.5 * cm, 3.5 * cm, 4.0 * cm],
    )
    fila_meta.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), AZUL_CLARO),
        ("BOX",          (0, 0), (-1, -1), 0.5, GRIS_BORDE),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]))

    elementos: List[Any] = [fila_meta]

    # Contexto del párrafo (si existe)
    if contexto:
        caja_ctx = Table(
            [
                [Paragraph("<b>Contexto del párrafo en el documento</b>", estilos["etiqueta"])],
                [Paragraph(_esc(contexto), estilos["contexto"])],
            ],
            colWidths=[16.5 * cm],
        )
        caja_ctx.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),
            ("BOX",          (0, 0), (-1, -1), 0.5, colors.HexColor("#bae6fd")),
            ("LEFTPADDING",  (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING",   (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
        ]))
        elementos.append(Spacer(1, 0.15 * cm))
        elementos.append(caja_ctx)

    elementos.append(Spacer(1, 0.2 * cm))
    return elementos


# ---------------------------------------------------------------------------
# Bloque individual de riesgo — esquema v2.0
# ---------------------------------------------------------------------------

def _bloque_riesgo(riesgo: Dict[str, Any], indice: int, estilos: Dict[str, ParagraphStyle]) -> List[Any]:

    # ── Campos del esquema v2.0 ──────────────────────────────────────────
    nombre       = riesgo.get("riesgo_identificado") or f"Riesgo {indice}"
    criticidad   = str(riesgo.get("criticidad", "N/D")).upper()
    tipo_riesgo  = str(riesgo.get("tipo_riesgo", "N/D")).upper()
    seccion      = riesgo.get("seccion_bases", "N/D")
    origen       = riesgo.get("origen_matriz", "N/D")
    id_matriz    = riesgo.get("id_riesgo_matriz", "N/D")
    num_riesgo   = riesgo.get("numero_riesgo", str(indice))

    evidencia_licitacion  = riesgo.get("evidencia_licitacion", "No registrado.")
    sustento_legal        = riesgo.get("sustento_legal_normativo") or "No registrado."
    impacto               = riesgo.get("impacto_comercial_financiero") or riesgo.get("impacto_en_decision") or ""
    propuesta_observacion = riesgo.get("propuesta_observacion_formal") or riesgo.get("recomendacion") or ""

    score       = riesgo.get("precision_score", 0)
    nivel       = riesgo.get("precision_nivel", "N/D")
    trazabilidad = riesgo.get("trazabilidad", {})
    traz_lic    = trazabilidad.get("evidencia_licitacion", {}) if isinstance(trazabilidad, dict) else {}
    traz_leg    = trazabilidad.get("sustento_legal_normativo", {}) if isinstance(trazabilidad, dict) else {}

    # ── Colores dinámicos ────────────────────────────────────────────────
    color_crit  = _COLOR_CRITICIDAD.get(criticidad, AZUL_OSCURO)
    color_tipo  = _COLOR_TIPO.get(tipo_riesgo, AZUL_OSCURO)
    color_score = ROJO_ALERTA if score < 50 else (AMARILLO_MED if score < 80 else VERDE_OK)

    def _estilo_inline(color: Any) -> ParagraphStyle:
        return ParagraphStyle("_inline", parent=estilos["cuerpo"],
                              textColor=color, fontName="Helvetica-Bold", fontSize=9)

    # ── Encabezado del riesgo ────────────────────────────────────────────
    elementos: List[Any] = [
        Paragraph(f"Riesgo #{num_riesgo} — {_esc(nombre)}", estilos["riesgo_titulo"]),
        Table(
            [[
                Paragraph(f"<b>Tipo:</b> {_esc(tipo_riesgo)}", _estilo_inline(color_tipo)),
                Paragraph(f"<b>Criticidad:</b> {_esc(criticidad)}", _estilo_inline(color_crit)),
                Paragraph(f"<b>Sección:</b> {_esc(seccion)}", estilos["cuerpo"]),
                Paragraph(f"<b>Origen:</b> {_esc(origen)} | ID: {_esc(id_matriz)}", estilos["cuerpo"]),
            ]],
            colWidths=[3.8 * cm, 3.5 * cm, 5.2 * cm, 4.0 * cm],
        ),
        Spacer(1, 0.2 * cm),
    ]

    # ── Ficha de auditoría legal (campos nuevos) ─────────────────────────
    elementos.extend(_ficha_auditoria_legal(riesgo, estilos))

    # ── Score de precisión ───────────────────────────────────────────────
    elementos.append(
        Paragraph(
            f"<b>Precisión de detección:</b> {score}/100 — {_esc(nivel)}",
            _estilo_inline(color_score),
        )
    )
    detalle_score = riesgo.get("precision_detalle", [])
    if detalle_score:
        elementos.append(
            Paragraph(" &nbsp;|&nbsp; ".join(_esc(d) for d in detalle_score), estilos["evidencia"])
        )
    elementos.append(Spacer(1, 0.15 * cm))

    # ── Alerta de validación humana ──────────────────────────────────────
    if riesgo.get("requiere_validacion_humana"):
        elementos.append(Paragraph("⚠ REQUIERE VALIDACIÓN MANUAL POR UN ESPECIALISTA", estilos["aviso"]))
        alerta = riesgo.get("alerta_sistema")
        if alerta:
            elementos.append(Paragraph(_esc(alerta), estilos["cuerpo"]))
        elementos.append(Spacer(1, 0.1 * cm))

    # ── Impacto comercial / financiero ───────────────────────────────────
    if impacto:
        elementos += [
            Paragraph("Impacto comercial y financiero", estilos["etiqueta"]),
            Paragraph(_esc(impacto), estilos["cuerpo"]),
            Spacer(1, 0.15 * cm),
        ]

    # ── Caja: Evidencia literal de la licitación ─────────────────────────
    frag_lic = traz_lic.get("fragmento_literal_fuente") or evidencia_licitacion
    idx_lic  = traz_lic.get("indice_aproximado_caracter", "N/D")
    doc_lic  = traz_lic.get("documento", "licitacion")
    ok_lic   = "✓ Localizada" if traz_lic.get("encontrado") else "✗ No localizada"
    pagina_pdf_lic = traz_lic.get("pagina_pdf") or riesgo.get("pagina_pdf") or "N/D"
    meta_lic = (
        f"{ok_lic} | Posición: #{idx_lic} | "
        f"Pág. PDF: {pagina_pdf_lic} | Fuente: {str(doc_lic).upper()}"
    )

    caja_lic = Table(
        [
            [Paragraph("<b>Evidencia literal — Licitación</b>", estilos["etiqueta"])],
            [Paragraph(_esc(frag_lic), estilos["evidencia"])],
            [Paragraph(meta_lic, estilos["meta_trazabilidad"])],
        ],
        colWidths=[16.5 * cm],
    )
    caja_lic.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), GRIS_CLARO),
        ("BOX",          (0, 0), (-1, -1), 0.5, GRIS_BORDE),
        ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    elementos += [caja_lic, Spacer(1, 0.2 * cm)]

    # ── Caja: Sustento legal / normativo ─────────────────────────────────
    frag_leg = traz_leg.get("fragmento_literal_fuente") or sustento_legal
    idx_leg  = traz_leg.get("indice_aproximado_caracter", "N/D")
    doc_leg  = traz_leg.get("documento", "normativa")
    ok_leg   = "✓ Localizado" if traz_leg.get("encontrado") else "✗ No localizado"
    refs_nv  = traz_leg.get("referencias_no_localizadas", [])
    nombre_norm_leg = (
        traz_leg.get("nombre_archivo_normativa")
        or riesgo.get("nombre_archivo_normativa")
        or "N/D"
    )
    meta_leg = (
        f"{ok_leg} | Posición: #{idx_leg} | "
        f"Archivo: {nombre_norm_leg} | Fuente: {str(doc_leg).upper()}"
    )
    if refs_nv:
        meta_leg += f" | Refs. no verificadas: {', '.join(refs_nv)}"

    caja_leg = Table(
        [
            [Paragraph("<b>Sustento legal — Normativa reguladora</b>", estilos["etiqueta"])],
            [Paragraph(_esc(frag_leg), estilos["evidencia"])],
            [Paragraph(meta_leg, estilos["meta_trazabilidad"])],
        ],
        colWidths=[16.5 * cm],
    )
    caja_leg.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX",          (0, 0), (-1, -1), 0.5, GRIS_BORDE),
        ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    elementos += [caja_leg, Spacer(1, 0.2 * cm)]

    # ── Caja: Propuesta de observación formal ────────────────────────────
    if propuesta_observacion:
        num_obs = riesgo.get("numero_observacion", "")
        header_obs = (
            f"<b>Propuesta de observación formal al pliego"
            f"{' — ' + _esc(num_obs) if num_obs else ''}</b>"
        )
        plazo = riesgo.get("plazo_limite")
        filas_obs = [
            [Paragraph(header_obs, estilos["etiqueta"])],
            [Paragraph(_esc(propuesta_observacion), estilos["observacion"])],
        ]
        if plazo:
            filas_obs.append([
                Paragraph(f"⏰ <b>Plazo límite para presentar:</b> {_esc(plazo)}", estilos["plazo"])
            ])

        caja_obs = Table(filas_obs, colWidths=[16.5 * cm])
        caja_obs.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, -1), colors.HexColor("#eff6ff")),
            ("BOX",          (0, 0), (-1, -1), 0.8, colors.HexColor("#1d4ed8")),
            ("LEFTPADDING",  (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING",   (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ]))
        elementos += [caja_obs, Spacer(1, 0.2 * cm)]

    # ── Separador ────────────────────────────────────────────────────────
    sep = Table([[""]], colWidths=[16.5 * cm], rowHeights=[0.04 * cm])
    sep.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), GRIS_BORDE)]))
    elementos += [sep, Spacer(1, 0.4 * cm)]

    return elementos


# ---------------------------------------------------------------------------
# Función principal de generación
# ---------------------------------------------------------------------------

def generar_pdf_informe(data_analisis: Dict[str, Any]) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm,  bottomMargin=2 * cm,
        title="Informe de Auditoría Contractual",
    )

    estilos   = _estilos()
    resultado = data_analisis.get("resultado") or data_analisis
    if not isinstance(resultado, dict):
        resultado = {}

    metadata: Dict[str, Any] = resultado.get("metadata_analisis") or {}
    riesgos: List[Dict[str, Any]] = resultado.get("riesgos_detectados") or []

    story: List[Any] = [
        Paragraph("INFORME DE AUDITORÍA Y MATRIZ DE RIESGOS CONTRACTUALES", estilos["titulo"]),
        Paragraph("Asistente Legal AI — Análisis de licitaciones y contratos públicos", estilos["subtitulo"]),
        _tabla_metadatos(data_analisis, estilos),
        Spacer(1, 0.5 * cm),
    ]

    story.extend(_bloque_resumen(resultado, estilos))
    story.extend(_tabla_distribucion(metadata, estilos))

    story.append(Paragraph("2. Matriz de Riesgos Detectados", estilos["seccion"]))

    if not riesgos:
        story.append(Paragraph("No se registraron riesgos en este análisis.", estilos["cuerpo"]))
    else:
        for i, riesgo in enumerate(riesgos, start=1):
            if isinstance(riesgo, dict):
                story.extend(_bloque_riesgo(riesgo, i, estilos))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()