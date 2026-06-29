from fastapi import APIRouter, HTTPException, Response
from app.services.campos_estandar import leer_nombre_archivo_licitacion
from app.services.informe_store import obtener_informe
from app.services.risk_engine.chroma_store import obtener_informe_desde_chroma
from app.services.pdf_generator import generar_pdf_informe
from app.services.excel_generator import generar_excel_informe

router = APIRouter(tags=["Informes"])

def _limpiar_nombre_archivo(nombre_base: str) -> str:
    return "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in nombre_base.replace(".pdf", ""))

@router.get("/descargar-informe/{id_analisis}", response_class=Response, summary="Descargar informe PDF")
async def descargar_informe(id_analisis: str) -> Response:
    data_analisis = obtener_informe_desde_chroma(id_analisis) or obtener_informe(id_analisis)

    if not data_analisis:
        raise HTTPException(status_code=404, detail=f"Informe '{id_analisis}' no encontrado.")
    if not data_analisis.get("resultado"):
        raise HTTPException(status_code=400, detail="Este análisis no contiene resultado exportable a PDF.")

    try:
        pdf_bytes = generar_pdf_informe(data_analisis)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {exc}")

    nombre_limpio = _limpiar_nombre_archivo(str(leer_nombre_archivo_licitacion(data_analisis) or "informe"))

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="informe_riesgos_{nombre_limpio}.pdf"',
            "Cache-Control": "no-store",
        },
    )

@router.get("/descargar-excel/{id_analisis}", response_class=Response, summary="Descargar informe Excel")
async def descargar_excel(id_analisis: str) -> Response:
    data_analisis = obtener_informe_desde_chroma(id_analisis) or obtener_informe(id_analisis)

    if not data_analisis:
        raise HTTPException(status_code=404, detail=f"Informe '{id_analisis}' no encontrado.")
    if not data_analisis.get("resultado"):
        raise HTTPException(status_code=400, detail="Este análisis no contiene resultado exportable a Excel.")

    try:
        excel_bytes = generar_excel_informe(data_analisis)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error generando Excel: {exc}")

    nombre_limpio = _limpiar_nombre_archivo(str(leer_nombre_archivo_licitacion(data_analisis) or "informe"))

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="auditoria_riesgos_{nombre_limpio}.xlsx"',
            "Cache-Control": "no-store",
        },
    )