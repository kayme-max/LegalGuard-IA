# Esquema de Datos - Identificar Riesgos (Análisis)

Este documento detalla la estructura de datos que utiliza el frontend para el módulo de **Identificar Riesgos**. Se divide en dos partes: lo que el frontend **envía** al backend (el *payload* de la petición) y lo que el backend **debe responder**.

## 1. Lo que el Frontend envía al Backend

Cuando el usuario hace clic en "Procesar y Analizar Documento", el frontend envía los datos utilizando `FormData` (Content-Type: `multipart/form-data`) al endpoint `/analizar` mediante el método `POST`.

### Estructura del `FormData`

| Campo (Key) | Tipo de Dato | Descripción |
| :--- | :--- | :--- |
| `nombreProyecto` | `string` | Nombre asignado al proyecto. |
| `sector` | `string` | Sector seleccionado (Ej. `Público`, `Privado`). |
| `tipoContrato` | `string` (JSON) | Lista de tipos de contrato seleccionados (El backend lo puede recibir como un string JSON o array de strings dependiendo del parser). (Ej. `["Obras por Impuestos (Oxi)", "Asociación Público-Privada"]`) |
| `categoria` | `string` (JSON) | Lista de categorías a evaluar seleccionadas. (Ej. `["LEGAL", "TÉCNICO"]`) |
| `licitacion` | `File` | El archivo principal de la licitación subido por el usuario (PDF). |
| `normativas` | `File` (Múltiples) | Los archivos normativos opcionales subidos por el usuario (se pueden enviar múltiples archivos bajo la misma key `normativas` o `normativas[]`). |

*Nota: Para implementar esto en el frontend (en `IdentificarRiesgos.tsx`), la construcción del FormData se realizaría así:*
```javascript
const formData = new FormData();
formData.append('nombreProyecto', formDataState.nombreProyecto);
formData.append('sector', formDataState.sector);
formData.append('tipoContrato', JSON.stringify(formDataState.tipoContrato));
formData.append('categoria', JSON.stringify(formDataState.categoria));
formData.append('licitacion', licitacionFile);
normativasFiles.forEach(file => formData.append('normativas', file));
```

## 2. Lo que el Backend debe responder al Frontend

El backend debe responder con un objeto JSON. La estructura principal esperada por la interfaz (definida en la interfaz `BackendResponse` en TypeScript) es la siguiente:

### Estructura de la Respuesta JSON (`BackendResponse`)

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `archivo_licitacion` | `string` | Nombre del archivo de licitación analizado. |
| `normativas_cargadas` | `array de strings` | Lista con los nombres de las normativas que fueron analizadas. |
| `proyecto` | `string` | Tipo de contrato o nombre del proyecto analizado. |
| `sector` | `string` | Sector analizado. |
| `categoria` | `string` | Categoría principal del análisis. |
| `subcategoria` | `string` | Subcategoría del análisis (opcional). |
| `origen_data` | `string` | Identificador del origen (Ej. `"ARCHIVOS_NUEVOS"`). |
| `status` | `string` | Estado del procesamiento (Ej. `"SUCCESS"`, `"ERROR"`). |
| `mensaje` | `string` | Mensaje descriptivo del resultado del proceso. |
| `resultado` | `object` | Objeto contenedor de los resultados del análisis. (Ver detalle abajo) |
| `id_analisis` | `string` (Opcional) | Identificador único de esta ejecución de análisis (UUID). |
| `url_descarga_pdf` | `string` (Opcional) | URL para descargar el informe en PDF generado por el backend. |
| `url_descarga_excel` | `string` (Opcional) | URL para descargar el informe en Excel generado por el backend. |

### Detalle del objeto `resultado`

El campo `resultado` de la respuesta debe tener la siguiente estructura:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `riesgos_detectados` | `array de objetos` | Lista de riesgos encontrados en el documento. **Cada objeto debe seguir la misma estructura descrita en el `ESQUEMA_BASE_CONOCIMIENTO.md`** (`Riesgo`). |
| `resumen_ejecutivo` | `string` (Opcional) | Un texto resumen generado por la IA con el diagnóstico general del análisis. |

### Ejemplo de Respuesta Exitosa del Backend

```json
{
  "archivo_licitacion": "bases_proyecto_puente.pdf",
  "normativas_cargadas": [
    "DS_011-2024-EF.pdf",
    "Ley_Contrataciones.pdf"
  ],
  "proyecto": "CONSTRUCCION",
  "sector": "PÚBLICO",
  "categoria": "LEGAL",
  "subcategoria": "CONTROVERSIAS",
  "origen_data": "ARCHIVOS_NUEVOS",
  "status": "SUCCESS",
  "mensaje": "Análisis legal completado exitosamente.",
  "resultado": {
    "riesgos_detectados": [
      {
        "id": "101",
        "numero_riesgo": "OXI-00001",
        "sector": "PÚBLICO",
        "tipo_contrato": "CONSTRUCCION",
        "categoria": "LEGAL",
        "riesgo_identificado": "Estudio de Preinversión obsoleto.",
        "foco_revision": "TECNICO",
        "nombre_archivo_licitacion": "bases_proyecto_puente.pdf",
        "seccion_bases": "1.4. ANTECEDENTES",
        "pagina_pdf": 2,
        "nombre_archivo_normativa": "DS_011-2024-EF.pdf",
        "nivel_sustento_documental": "MEDIO",
        "alerta_sistema": "Surgiere revisión manual",
        "activo": true
      }
    ],
    "resumen_ejecutivo": "Auditoría completada. Se detectaron 1 riesgos. La evaluación global sugiere viabilidad técnica condicionada."
  },
  "id_analisis": "f9075685-c57b-4137-a416-7c8bef89df73"
}
```
