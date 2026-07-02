import { pgTable, text, timestamp, jsonb, integer, uuid, customType } from 'drizzle-orm/pg-core';

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return typeof value === 'string' ? JSON.parse(value) : value;
  },
});

export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  session_id: text('session_id').notNull(),
  document_name: text('document_name').notNull(),
  document_type: text('document_type').notNull(),
  chunk_text: text('chunk_text').notNull(),
  embedding: vector('embedding'),
  created_at: timestamp('created_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: text('status').notNull(),
  resultado: jsonb('resultado'),
  error: text('error'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const tiposContrato = pgTable('tipos_contrato', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: text('nombre').unique().notNull(),
  prompt_sistema: text('prompt_sistema').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const baseConocimiento = pgTable('base_conocimiento', {
  id: text('id').primaryKey(),
  numero_riesgo: text('numero_riesgo'),
  tipo_contrato: text('tipo_contrato'),
  tipo_contrato_id: uuid('tipo_contrato_id').references(() => tiposContrato.id),
  sector: text('sector'),
  categoria: text('categoria'),
  subcategoria: text('subcategoria'),
  riesgo_identificado: text('riesgo_identificado'),
  foco_revision: text('foco_revision'),
  criticidad: text('criticidad'),
  nombre_archivo_licitacion: text('nombre_archivo_licitacion'),
  seccion_evidencia_licitacion: text('seccion_evidencia_licitacion'),
  pagina_pdf_licitacion: text('pagina_pdf_licitacion'),
  fragmento_licitacion_evidencia: text('fragmento_licitacion_evidencia'),
  nombre_archivo_normativa: text('nombre_archivo_normativa'),
  evidencia_seccion_normativa_riesgo: text('evidencia_seccion_normativa_riesgo'),
  nivel_sustento_documental: text('nivel_sustento_documental'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const resultadoAnalisis = pgTable('resultado_analisis', {
  id_analisis: uuid('id_analisis').defaultRandom().primaryKey(),
  nombre_base_proyecto: text('nombre_base_proyecto'),
  tipo_contrato: text('tipo_contrato'),
  sector: text('sector'),
  mensaje: text('mensaje'),
  resumen_ejecutivo: text('resumen_ejecutivo'),
  url_descarga_excel: text('url_descarga_excel'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  tiempo_identificacion_riesgo: text('tiempo_identificacion_riesgo'),
});

export const riesgosIdentificados = pgTable('riesgos_identificados', {
  id: uuid('id').defaultRandom().primaryKey(),
  id_analisis: uuid('id_analisis').references(() => resultadoAnalisis.id_analisis),
  riesgo_id: text('riesgo_id'),
  tipo_contrato: text('tipo_contrato'),
  sector: text('sector'),
  categoria: text('categoria'),
  subcategoria: text('subcategoria'),
  riesgo_identificado: text('riesgo_identificado'),
  foco_revision: text('foco_revision'),
  nombre_archivo_licitacion: text('nombre_archivo_licitacion'),
  seccion_evidencia_licitacion: text('seccion_evidencia_licitacion'),
  pagina_pdf_licitacion: text('pagina_pdf_licitacion'),
  fragmento_licitacion_evidencia: text('fragmento_licitacion_evidencia'),
  nombre_archivo_normativa: text('nombre_archivo_normativa'),
  evidencia_seccion_normativa_riesgo: text('evidencia_seccion_normativa_riesgo'),
  nivel_sustento_documental: text('nivel_sustento_documental'),
});
