import os
import json
from google import genai

SYSTEM_PROMPT = """Eres un Asistente de Inteligencia Artificial experto en Compliance y Gestión de Riesgos Legales en Contrataciones Públicas y Licitaciones. Tu único objetivo es identificar contingencias, riesgos contractuales y vacíos legales cruzando el "Documento de Licitación" con los documentos de "Soporte Normativo" proveídos.

[MECANISMO CRÍTICO DE CONTROL Y VALIDACIÓN DE CONTEXTO]
Antes de realizar cualquier análisis de riesgos, debes evaluar semánticamente si los documentos cargados en el campo de "Normativas/Soporte" son realmente textos legales (Leyes, Decretos, Directivas, Reglamentos, Órdenes, Contratos, etc.).
- Si detectas que los documentos de soporte NO son normativos (por ejemplo: si son informes puramente técnicos, papers estadísticos, validaciones de modelos de Inteligencia Artificial como XGBoost, SHAP, ciencias de datos en Fintechs, manuales de software, diagramas de flujo, etc.), debes activar el protocolo de rechazo de inmediato. No intentes forzar leyes inventadas ni busques correlaciones falsas.

Tu flujo de decisión y formato de respuesta debe ajustarse ESTRICTAMENTE a las siguientes directrices y retornar un archivo JSON estructurado:

1. ESCENARIO DE ÉXITO (ARCHIVOS VÁLIDOS):
{{
  "origen_data": "ARCHIVOS_NUEVOS",
  "status": "SUCCESS",
  "mensaje": "Análisis legal completado exitosamente a partir de las normativas proveídos.",
  "resultado": {{
    "riesgos_detectados": [
      {{
        "riesgo": "[Nombre del riesgo legal hallado]",
        "evidencia_licitacion": "[Sección o numeral exacto del documento de licitación]",
        "sustento_legal": "[Artículo y norma exacta del documento normativo analizado]",
        "criticidad": "ALTA/MEDIA/BAJA",
        "impacto_en_decision": "[Explicación de cómo afecta económicamente o legalmente al postor]",
        "recomendacion": "[Estrategia de mitigación legal específica]"
      }}
    ]
  }}
}}

2. ESCENARIO DE ERROR (ARCHIVOS INVÁLIDOS):
{{
  "origen_data": "SOLICITAR_CHROMADB",
  "status": "INVALID_NEW_DOCUMENTS",
  "mensaje": "Los documentos nuevos cargados no corresponden a normativas o soportes válidos para identificar riesgos legales.",
  "resultado": null
}}

[REGLAS ADICIONALES DE SEGURIDAD]
- Queda estrictamente prohibido alucinar o inventar números de leyes, ordenanzas municipales o artículos si el documento normativo no los menciona de forma explícita.
- Mantén un tono técnico, conciso, jurídico y directo.
- Responde única y exclusivamente el objeto JSON válido, sin introducciones, saludos ni textos explicativos fuera del bloque JSON."""


class AuditorLegal:
    def __init__(self, matriz_riesgos_json):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.matriz = matriz_riesgos_json

    def filtrar_matriz(self, proyecto, sector):
        riesgos = self.matriz.get("RIESGOS_LEGAL", {}).get("riesgos", [])
        return [
            r for r in riesgos
            if r.get("proyecto", "").upper() == proyecto.upper()
            and r.get("sector", "").upper() == sector.upper()
        ]

    async def evaluar_documento(self, texto_pdf, textos_normativa, proyecto, sector):
        riesgos_historicos = self.filtrar_matriz(proyecto, sector)

        prompt_usuario = f"""
DOCUMENTO DE LICITACIÓN:
{texto_pdf[:500000]}

MARCO LEGAL / NORMATIVAS SUBIDAS:
{textos_normativa[:200000] if textos_normativa else "No se subieron normativas adicionales."}

RIESGOS HISTÓRICOS (MATRIZ INTERNA):
{json.dumps(riesgos_historicos, ensure_ascii=False)}

CONTEXTO DEL ANÁLISIS:
- Tipo de Proyecto: {proyecto}
- Sector: {sector}

INSTRUCCIÓN DE PRECISIÓN JURÍDICA:
1. Busca el artículo exacto en el texto de la normativa subida antes de citarlo.
   - Riesgos sobre controversias → busca 'controversias' en la normativa.
   - Riesgos sobre plazos fiscales → busca 'plazo' o 'fiscal' en la normativa.
   - Riesgos sobre garantías → busca 'garantía' o 'CIPRL' en la normativa.
2. Si no estás 100% seguro del número de artículo, escribe: 'Referenciado en el cuerpo normativo de [nombre del archivo]'.
3. NUNCA inventes un número de artículo.
4. LÍMITES LEGALES A VERIFICAR SIEMPRE:
   - Penalidades máximas acumulables: 10% del monto total del contrato.
   - Modificaciones al convenio: no pueden superar el 30% si tiene expediente técnico aprobado.
   - Vigencia de CIPRL: 10 años, son negociables.
   - Plazo de remisión de compromisos fiscales: 31 de julio para Gobiernos Regionales/Locales.

Retorna únicamente el objeto JSON según las instrucciones del sistema.
"""

        response = self.client.models.generate_content(
            model="gemini-2.0-flash",
            contents=f"{SYSTEM_PROMPT}\n\n{prompt_usuario}"
        )

        texto_respuesta = response.text.strip()
        if texto_respuesta.startswith("```"):
            texto_respuesta = texto_respuesta.split("```")[1]
            if texto_respuesta.startswith("json"):
                texto_respuesta = texto_respuesta[4:]

        return json.loads(texto_respuesta)