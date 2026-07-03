-- Habilitar extensiones necesarias (ejecutar como superusuario si es necesario)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla: base_conocimiento
CREATE TABLE IF NOT EXISTS base_conocimiento (
    id TEXT PRIMARY KEY,
    numero_riesgo TEXT,
    sector TEXT,
    tipo_contrato TEXT,
    categoria TEXT,
    subcategoria TEXT,
    riesgo_identificado TEXT,
    foco_revision TEXT,
    criticidad TEXT,
    id_analisis TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    nombre_archivo_licitacion TEXT,
    seccion_evidencia_licitacion TEXT,
    pagina_pdf_licitacion TEXT,
    fragmento_licitacion_evidencia TEXT,
    nombre_archivo_normativa TEXT,
    evidencia_seccion_normativa_riesgo TEXT,
    nivel_sustento_documental TEXT,
    tipo_contrato_id UUID
);

-- Tabla: document_chunks
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT,
    document_name TEXT,
    chunk_text TEXT,
    embedding vector(768),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    document_type TEXT
);

-- Tabla: resultado_analisis
CREATE TABLE IF NOT EXISTS resultado_analisis (
    id_analisis UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_base_proyecto TEXT,
    tipo_contrato TEXT,
    sector TEXT,
    mensaje TEXT,
    resumen_ejecutivo TEXT,
    url_descarga_excel TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tiempo_identificacion_riesgo TEXT,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: riesgos_identificados
CREATE TABLE IF NOT EXISTS riesgos_identificados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_analisis UUID REFERENCES resultado_analisis(id_analisis),
    riesgo_id TEXT,
    tipo_contrato TEXT,
    sector TEXT,
    categoria TEXT,
    subcategoria TEXT,
    riesgo_identificado TEXT,
    foco_revision TEXT,
    nombre_archivo_licitacion TEXT,
    seccion_evidencia_licitacion TEXT,
    pagina_pdf_licitacion TEXT,
    fragmento_licitacion_evidencia TEXT,
    nombre_archivo_normativa TEXT,
    evidencia_seccion_normativa_riesgo TEXT,
    nivel_sustento_documental TEXT
);

-- Tabla: tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT,
    resultado JSONB,
    error TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: tipos_contrato
CREATE TABLE IF NOT EXISTS tipos_contrato (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT,
    prompt_sistema TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
