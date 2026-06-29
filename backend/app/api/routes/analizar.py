import json
from typing import Optional, List, Union
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from json_repair import repair_json

from app.services.campos_estandar import normalizar_payload_analisis
from app.services.file_service import eliminar_archivo, guardar_pdf_temporal
from app.services.informe_store import guardar_informe
from app.services.risk_engine import analizar_documento_con_normativa
from app.services.risk_engine.chroma_store import persistir_informe_para_descarga
from app.services.risk_engine.exceptions import LLMContextTooLargeError, LLMRateLimitError

router = APIRouter(tags=["Análisis"])

def _respuesta_con_id(payload: dict) -> dict:
    payload = normalizar_payload_analisis(payload)
    resultado = payload.get("resultado") or {}

    riesgos = resultado if isinstance(resultado, list) else resultado.get("riesgos_detectados", [])

    # Inyectar campos del contexto del análisis en cada riesgo si el LLM no los incluyó
    for riesgo in riesgos:
        if isinstance(riesgo, dict):
            riesgo.setdefault("sector", payload.get("sector"))
            riesgo.setdefault("tipo_contrato", payload.get("tipo_contrato"))
            riesgo.setdefault("nombre_archivo_licitacion", payload.get("nombre_archivo_licitacion"))
            riesgo.setdefault("activo", True)
            riesgo.setdefault("nivel_sustento_documental", "MEDIO")
            riesgo.setdefault("alerta_sistema", None)

    response = {
        "archivo_licitacion": payload.get("nombre_archivo_licitacion"),
        "normativas_cargadas": payload.get("normativas_cargadas", []),
        "proyecto": payload.get("tipo_contrato"),
        "sector": payload.get("sector"),
        "categoria": payload.get("categoria"),
        "subcategoria": payload.get("subcategoria"),
        "origen_data": payload.get("origen_data"),
        "status": payload.get("status"),
        "mensaje": payload.get("mensaje"),
        "resultado": {
            "riesgos_detectados": riesgos,
            "resumen_ejecutivo": resultado.get("resumen_ejecutivo") if isinstance(resultado, dict) else None,
            "metadata_analisis": resultado.get("metadata_analisis") if isinstance(resultado, dict) else None,
        }
    }

    if response["status"] is not None and resultado is not None:
        registro = {
            "nombre_archivo_licitacion": payload.get("nombre_archivo_licitacion"),
            "normativas_cargadas": payload.get("normativas_cargadas", []),
            "tipo_contrato": payload.get("tipo_contrato"),
            "sector": payload.get("sector"),
            "categoria": payload.get("categoria"),
            "subcategoria": payload.get("subcategoria"),
            "status": payload.get("status"),
            "mensaje": payload.get("mensaje"),
            "origen_data": payload.get("origen_data"),
            "resultado": resultado,
        }

        id_analisis = guardar_informe(registro)
        response["id_analisis"] = id_analisis

        persistir_informe_para_descarga(id_analisis, registro)

        response["url_descarga_pdf"] = f"/descargar-informe/{id_analisis}"
        response["url_descarga_excel"] = f"/descargar-excel/{id_analisis}"

    return response



@router.post("/analizar")
async def analizar(
    tipo_contrato: str = Form(..., description="Tipo de contrato"),
    sector: str = Form(..., description="Sector: PRIVADO | PUBLICO"),
    categoria: Optional[str] = Form(None, description="Categoría de riesgo"),
    subcategoria: Optional[str] = Form(None, description="Subcategoría de riesgo"),
    licitacion: UploadFile = File(..., description="Documento principal de la licitación (PDF)"),
    # Aceptamos UploadFile o str para evitar el error 422 si envían un texto vacío
    normativas: List[Union[UploadFile, str]] = File(default=[], description="Normativas PDF opcionales (múltiples)"),
):
    if not licitacion.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="La licitación debe ser un PDF")

    path_licitacion = guardar_pdf_temporal(licitacion)
    paths_normativas = []

    for normativa in normativas:
        # Ignoramos si 'normativa' es un string vacío que llegó por error en el FormData
        if isinstance(normativa, UploadFile) and normativa.filename and normativa.filename.lower().endswith(".pdf"):
            paths_normativas.append(guardar_pdf_temporal(normativa))

    try:
        analisis_motor = await analizar_documento_con_normativa(
            path_licitacion=path_licitacion,
            paths_normativas=paths_normativas,
            proyecto=tipo_contrato,
            sector=sector,
            filename_licitacion=licitacion.filename,
            categorias_auditadas=[],
        )

        datos_motor = analisis_motor.get("datos")
        if isinstance(datos_motor, str):
            try:
                datos_motor = json.loads(repair_json(datos_motor))
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"JSON inválido en datos LLM tras reparación: {exc}")

        if datos_motor is None:
            datos_motor = {}
        elif not isinstance(datos_motor, dict):
            raise HTTPException(status_code=400, detail="JSON de análisis no es un objeto válido.")

        # Filtramos para registrar solo los nombres de los archivos válidos
        normativas_cargadas = [
            n.filename for n in normativas 
            if isinstance(n, UploadFile) and n.filename
        ]
        origen = analisis_motor.get("origen_data", "ARCHIVOS_NUEVOS")
        resultado_final = analisis_motor.get("datos")

        base = {
            "nombre_archivo_licitacion": licitacion.filename,
            "normativas_cargadas": normativas_cargadas,
            "tipo_contrato": tipo_contrato,
            "sector": sector,
            "categoria": categoria,
            "subcategoria": subcategoria,
            "origen_data": origen,
        }

        if origen == "VECTOR_DB":
            return _respuesta_con_id({
                **base,
                "status": "WARNING",
                "mensaje": "Los documentos nuevos no son normativas válidas. Se recuperaron riesgos previos.",
                "resultado": resultado_final,
            })

        if origen == "NINGUNO":
            return normalizar_payload_analisis({
                **base,
                "status": "ERROR_VALIDATION",
                "mensaje": "Los documentos no son normativas válidas y no hay análisis previos.",
                "resultado": None,
            })

        return _respuesta_con_id({
            **base,
            "status": "SUCCESS",
            "mensaje": "Análisis legal completado exitosamente.",
            "resultado": resultado_final,
        })

    except LLMContextTooLargeError as e:
        raise HTTPException(status_code=413, detail={"error": "payload_too_large", "mensaje": "PDFs superan límite.", "detalle": str(e)})
    except LLMRateLimitError as e:
        raise HTTPException(status_code=429, detail={"error": "rate_limit_exceeded", "mensaje": "Límite de IA alcanzado.", "reintentar_en": e.retry_after})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        eliminar_archivo(path_licitacion)
        for p in paths_normativas:
            eliminar_archivo(p)


@router.post("/test-json")
def test_json():
    with open("app/data/response_1781555937415.json", "r", encoding="utf-8") as f:
        payload = json.load(f)
    id_analisis = guardar_informe(payload)
    return {"ok": True, "id_analisis": str(id_analisis)}