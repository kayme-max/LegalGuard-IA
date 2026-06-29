import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME", "db_ia_asistente"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
    )


def inicializar_db():
    conn = get_connection()
    cur = conn.cursor()

    # ================================================================
    # 1. Base de conocimiento institucional (sin cambios)
    # ================================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS base_conocimiento_riesgos (
            id                        SERIAL PRIMARY KEY,
            riesgo_id                 TEXT,
            sector                    TEXT,
            tipo_contrato             TEXT,
            categoria                 TEXT,
            subcategoria              TEXT,
            riesgo_identificado       TEXT,
            foco_revision             TEXT,
            nombre_archivo_licitacion TEXT,
            seccion_bases             TEXT,
            pagina_pdf                INTEGER,
            nombre_archivo_normativa  TEXT,
            contexto_parrafo          TEXT,
            evidencia_licitacion      TEXT,
            sustento_legal_normativo  TEXT,
            fragmento_literal_fuente  TEXT,
            nivel_sustento_documental TEXT,
            alerta_sistema            TEXT,
            activo                    BOOLEAN DEFAULT TRUE,
            created_at                TIMESTAMPTZ DEFAULT NOW(),
            updated_at                TIMESTAMPTZ DEFAULT NOW()
        );
    """)

    # ================================================================
    # 2. Análisis realizados (cabecera)
    # ================================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS analisis (
            id_analisis                TEXT PRIMARY KEY,
            nombre_archivo_licitacion  TEXT,
            tipo_contrato              TEXT,
            sector                     TEXT,
            origen_data                TEXT,
            status                     TEXT,
            mensaje                    TEXT,
            resumen_ejecutivo          TEXT,
            url_descarga_pdf           TEXT,
            url_descarga_excel         TEXT,
            fecha_creacion             TIMESTAMPTZ DEFAULT NOW()
        );
    """)

    # Migración suave de columnas legacy en analisis
    cur.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'analisis' AND column_name = 'archivo_licitacion'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'analisis' AND column_name = 'nombre_archivo_licitacion'
            ) THEN
                ALTER TABLE analisis RENAME COLUMN archivo_licitacion TO nombre_archivo_licitacion;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'analisis' AND column_name = 'proyecto'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'analisis' AND column_name = 'tipo_contrato'
            ) THEN
                ALTER TABLE analisis RENAME COLUMN proyecto TO tipo_contrato;
            END IF;
        END $$;
    """)

    # ================================================================
    # 3. Normativas asociadas a cada análisis (sin cambios)
    # ================================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS analisis_normativas (
            id             SERIAL PRIMARY KEY,
            id_analisis    TEXT REFERENCES analisis(id_analisis) ON DELETE CASCADE,
            nombre_archivo TEXT
        );
    """)

    # ================================================================
    # 4. Eliminar tablas legacy de riesgos
    # ================================================================
    cur.execute("DROP TABLE IF EXISTS riesgo_precision_detalle CASCADE;")
    cur.execute("DROP TABLE IF EXISTS riesgo_trazabilidad_evidencia CASCADE;")
    cur.execute("DROP TABLE IF EXISTS riesgo_trazabilidad_sustento CASCADE;")
    cur.execute("DROP TABLE IF EXISTS riesgo_referencias_no_localizadas CASCADE;")
    cur.execute("DROP TABLE IF EXISTS riesgos CASCADE;")

    # ================================================================
    # 5. Tabla única canónica: riesgos
    # ================================================================
    cur.execute("""
        CREATE TABLE riesgos (
            id                          SERIAL PRIMARY KEY,
            id_analisis                 TEXT NOT NULL REFERENCES analisis(id_analisis) ON DELETE CASCADE,

            -- Identificación
            riesgo_id                   VARCHAR(50),
            sector                      VARCHAR(100),
            tipo_contrato               VARCHAR(100),
            categoria                   VARCHAR(100),
            subcategoria                VARCHAR(100),

            -- Descripción
            riesgo_identificado         TEXT,
            foco_revision               TEXT,
            nombre_archivo_licitacion   VARCHAR(255),
            seccion_bases               TEXT,
            pagina_pdf                  INTEGER,

            -- Trazabilidad documental
            nombre_archivo_normativa    VARCHAR(255),
            contexto_parrafo            TEXT,
            evidencia_licitacion        TEXT,
            sustento_legal_normativo    TEXT,
            fragmento_literal_fuente    TEXT,

            -- Calidad y estado
            nivel_sustento_documental   VARCHAR(50),
            alerta_sistema              TEXT,
            activo                      BOOLEAN DEFAULT TRUE,

            -- Auditoría
            created_at                  TIMESTAMPTZ DEFAULT NOW(),
            updated_at                  TIMESTAMPTZ DEFAULT NOW()
        );
    """)

    # Índices
    cur.execute("CREATE INDEX idx_riesgos_id_analisis   ON riesgos(id_analisis);")
    cur.execute("CREATE INDEX idx_riesgos_categoria     ON riesgos(categoria);")
    cur.execute("CREATE INDEX idx_riesgos_sector        ON riesgos(sector);")
    cur.execute("CREATE INDEX idx_riesgos_tipo_contrato ON riesgos(tipo_contrato);")
    cur.execute("CREATE INDEX idx_riesgos_activo        ON riesgos(activo);")

    # Trigger updated_at
    cur.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    cur.execute("""
        CREATE TRIGGER trg_riesgos_updated_at
        BEFORE UPDATE ON riesgos
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)

    # ================================================================
    # 6. Matriz base legacy (se mantiene para compatibilidad)
    # ================================================================
    cur.execute("""
        CREATE TABLE IF NOT EXISTS matriz_riesgos (
            id                SERIAL PRIMARY KEY,
            proyecto          TEXT,
            sector            TEXT,
            categoria         TEXT,
            subcategoria      TEXT,
            riesgo_especifico TEXT,
            foco_revision     TEXT
        );
    """)

    conn.commit()
    cur.close()
    conn.close()
    print("✅ Base de datos inicializada correctamente.")