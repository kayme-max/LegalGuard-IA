export type View = "identificar" | "historial" | "conocimiento" | "administrar";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

export interface ConfigPrompt {
  id: string;
  tipo_contrato: string;
  prompt_interno: string;
  created_at?: string;
  updated_at?: string;
}

export interface Riesgo {
  id?: string;
  riesgo_id?: string;
  numero_riesgo: string;
  sector: string;
  tipo_contrato: string;
  categoria: string;
  subcategoria: string;
  riesgo_identificado: string;
  foco_revision?: string;
  nombre_archivo_licitacion?: string | null;
  seccion_evidencia_licitacion?: string | null;
  pagina_pdf_licitacion?: string | null;
  fragmento_licitacion_evidencia?: string | null;
  nombre_archivo_normativa?: string | null;
  evidencia_seccion_normativa_riesgo?: string | null;
  nivel_sustento_documental?: string | null;

  seccion_bases?: string | null;
  pagina_pdf?: number | string | null;
  contexto_parrafo?: string | null;
  fragmento_literal_fuente?: string | null;
  evidencia_licitacion?: string | null;
  sustento_legal_normativo?: string | null;
  
  alerta_sistema?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  activo?: boolean | null;
  requiere_validacion_humana?: boolean;
  precision_score?: number;
  precision_nivel?: string;
  criticidad?: string;
  id_riesgo_matriz?: string | number;
  id_analisis?: string;
}

export interface BackendResponse {
  archivo_licitacion: string;
  normativas_cargadas: string[];
  proyecto: string;
  sector: string;
  categoria: string;
  subcategoria?: string;
  origen_data: string;
  status: string;
  mensaje: string;
  id_analisis?: string;
  url_descarga_pdf?: string;
  url_descarga_excel?: string;
  resultado: {
    riesgos_detectados: Riesgo[];
    resumen_ejecutivo?: string;
  };
}

export interface AnalysisSession {
  id: string;
  fecha: string;
  filename: string;
  formData: {
    nombreProyecto: string;
    sector: string[];
    tipoContrato: string;
    categoria: string[];
    promptContexto?: string;
  };
  paginasLicitacion?: number;
  paginasNormativas?: number;
  result: BackendResponse;
  isFullyLoaded?: boolean;
  total_riesgos?: number;
}
