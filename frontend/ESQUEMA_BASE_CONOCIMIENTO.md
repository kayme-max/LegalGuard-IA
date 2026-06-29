# Esquema de Datos - Base de Conocimiento (Riesgos)

Este documento detalla la estructura de datos esperada por el frontend para el módulo de **Base de Conocimiento**. El backend debe enviar un arreglo de objetos con los siguientes campos cuando se consuma el endpoint `/base_conocimiento_riesgos`.

## Estructura Principal (`Riesgo`)

A continuación se listan los campos basados en la estructura definida para la comunicación entre Frontend y Backend:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `string` | Identificador único del registro en la base de datos (Backend). |
| `riesgo_id` | `string` | Identificador formateado (Ej. `#OXI-00001`). Opcional, el frontend lo puede autogenerar como `numero_riesgo`. |
| `numero_riesgo` | `string` | Identificador visual para el usuario en el frontend (Ej. `OXI-00001`). Si el backend no lo envía, el frontend intentará generarlo. |
| `sector` | `string` | Sector al que aplica el riesgo (Ej. `PRIVADO`, `PÚBLICO`). |
| `tipo_contrato` | `string` | Tipo de contrato o modalidad (Ej. `CONSTRUCCION`, `OXI`). |
| `categoria` | `string` | Categoría principal del riesgo (Ej. `LEGAL`, `TÉCNICO`). |
| `subcategoria` | `string` | Subcategoría detallada del riesgo (Ej. `CONTROVERSIAS`). |
| `riesgo_identificado` | `string` | (Requerido) Descripción detallada del riesgo identificado. |
| `foco_revision` | `string` | Área o foco de revisión (Ej. `TECNICO`, `ADMINISTRATIVO`). |
| `nombre_archivo_licitacion` | `string` \| `null` | Nombre del documento de licitación o bases analizadas. |
| `seccion_bases` | `string` \| `null` | Sección específica de las bases donde se identificó la contingencia. |
| `pagina_pdf` | `number` \| `null` | Número de página del documento donde se ubica el texto. |
| `nombre_archivo_normativa` | `string` \| `null` | Nombre del documento normativo contrastado (si aplica). |
| `contexto_parrafo` | `string` \| `null` | Párrafo completo o contexto donde se encontró el hallazgo. |
| `evidencia_licitacion` | `string` \| `null` | Fragmento de evidencia extraída de la licitación. |
| `sustento_legal_normativo` | `string` \| `null` | Justificación, principio, o base legal que sustenta el riesgo. |
| `fragmento_literal_fuente` | `string` \| `null` | Fragmento literal extraído de la normativa/fuente que valida el riesgo. (Puede venir como `fragmento_literal_licitacion` también). |
| `nivel_sustento_documental` | `string` \| `null` | Nivel de confianza o sustento del hallazgo (`ALTO`, `MEDIO`, `BAJO`, `MANUAL`). |
| `alerta_sistema` | `string` \| `null` | Mensaje de advertencia o sugerencia generada por el sistema. |
| `created_at` | `string` \| `null` | Fecha de creación del registro (Formato ISO 8601, Ej. `2026-06-22T19:14:33.354565Z`). |
| `updated_at` | `string` \| `null` | Fecha de la última actualización (Formato ISO 8601). |
| `activo` | `boolean` \| `null` | Estado lógico del registro (`true` para activo, `false` para inactivo/eliminado). |

### Campos Auxiliares (Frontend)
El frontend también maneja algunos campos extra internamente para el historial de análisis y validaciones, aunque no son obligatorios desde el backend de Base de Conocimiento, pueden ser enviados si existen:

* `requiere_validacion_humana`: `boolean`
* `precision_score`: `number`
* `precision_nivel`: `string`
* `criticidad`: `string`
* `origen_matriz`: `string`
* `id_riesgo_matriz`: `string` o `number`

## Ejemplo de Payload JSON (Respuesta Backend)

```json
[
  {
    "id": "001",
    "numero_riesgo": "OXI-00001",
    "riesgo_id": "#OXI-00001",
    "sector": "PRIVADO",
    "tipo_contrato": "CONSTRUCCION",
    "categoria": "LEGAL",
    "subcategoria": "CONTROVERSIAS",
    "riesgo_identificado": "Estudio de Preinversión obsoleto y desactualizado a normativa vigente.",
    "foco_revision": "TECNICO",
    "nombre_archivo_licitacion": "7353639-bases.pdf",
    "seccion_bases": "1.4. ANTECEDENTES",
    "pagina_pdf": 2,
    "nombre_archivo_normativa": "DS_011-2024-EF.pdf",
    "contexto_parrafo": "Mediante Informe N° 288-2017...",
    "evidencia_licitacion": "Mediante Informe N° 288-2017...",
    "sustento_legal_normativo": "Principio de Eficiencia...",
    "fragmento_literal_fuente": "Mediante Informe N° 288-2017...",
    "nivel_sustento_documental": "MEDIO",
    "alerta_sistema": "Atención: Se halló el riesgo...",
    "created_at": "2026-06-22T19:14:33.354565Z",
    "updated_at": "2026-06-22T19:14:33.354565Z",
    "activo": true
  }
]
```
