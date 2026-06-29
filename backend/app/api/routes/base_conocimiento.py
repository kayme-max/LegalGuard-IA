from fastapi import APIRouter
from app.services.database import get_connection

router = APIRouter()


@router.get("/base_conocimiento_riesgos")
def obtener_base_conocimiento():

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM base_conocimiento_riesgos
        ORDER BY id
    """)

    rows = cur.fetchall()
    columnas = [desc[0] for desc in cur.description]

    data = []

    for row in rows:
        item = dict(zip(columnas, row))

        # Campos que espera el frontend
        item["numero_riesgo"] = (
            item["riesgo_id"].replace("#", "")
            if item.get("riesgo_id")
            else None
        )

        item.setdefault("alerta_sistema", None)
        item.setdefault("nivel_sustento_documental", None)
        item.setdefault("requiere_validacion_humana", False)
        item.setdefault("precision_score", 0)
        item.setdefault("precision_nivel", "NO EVALUADO")
        item.setdefault("criticidad", None)
        item.setdefault("origen_matriz", None)
        item.setdefault("id_riesgo_matriz", None)

        data.append(item)

    cur.close()
    conn.close()

    return data