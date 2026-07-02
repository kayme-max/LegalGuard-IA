import { Riesgo, BackendResponse, AnalysisSession, ConfigPrompt } from "../types";

const API_BASE_URL = "/api";

export const AnalysisService = {
  async procesar(formData: FormData): Promise<BackendResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze-risk`, {
      method: "POST",
      headers: {
        "Accept": "application/json"
      },
      body: formData,
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      let errorMsg = `Error en el servidor: ${response.status}`;
      try {
        if (contentType && contentType.includes("application/json")) {
          const errData = await response.json();
          errorMsg = errData.error || errData.message || errorMsg;
          if (errData.details) errorMsg += ` - ${errData.details}`;
        } else {
          const text = await response.text();
          errorMsg = `Status ${response.status}. Respuesta inesperada: ${text.substring(0, 100)}`;
        }
      } catch (e) {
        errorMsg = `Status ${response.status}. No se pudo leer el error.`;
      }
      throw new Error(errorMsg);
    }

    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      if (text.toLowerCase().includes('<!doctype html>')) {
        throw new Error(`El servidor se está reiniciando o no está disponible temporalmente. Intente nuevamente en unos segundos.`);
      }
      throw new Error(`Se esperaba JSON pero se recibió: ${contentType}. Contenido: ${text.substring(0, 100)}`);
    }

    const initData = await response.json();
    const taskId = initData.taskId;
    
    if (!taskId) {
        return initData as BackendResponse;
    }

    // Polling until task completes
    return new Promise((resolve, reject) => {
        let failedAttempts = 0;
        const interval = setInterval(async () => {
            try {
                const statusRes = await fetch(`${API_BASE_URL}/analyze-risk/status/${taskId}`, {
                    headers: { "Accept": "application/json" }
                });
                
                if (!statusRes.ok) {
                    failedAttempts++;
                    console.warn(`[Polling] Advertencia: código ${statusRes.status}. Intento fallido ${failedAttempts}/5`);
                    if (failedAttempts >= 5) {
                        clearInterval(interval);
                        reject(new Error(`Error al consultar estado tras 5 intentos: ${statusRes.status}`));
                    }
                    return;
                }
                
                const contentType = statusRes.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    failedAttempts++;
                    console.warn(`[Polling] Advertencia: formato inválido. Intento fallido ${failedAttempts}/5`);
                    if (failedAttempts >= 5) {
                        clearInterval(interval);
                        reject(new Error(`El servidor devolvió un formato inválido tras 5 intentos.`));
                    }
                    return;
                }

                // Reset failed attempts on success
                failedAttempts = 0;
                const statusData = await statusRes.json();
                
                if (statusData.status === 'completed') {
                    clearInterval(interval);
                    resolve(statusData.result);
                } else if (statusData.status === 'error') {
                    clearInterval(interval);
                    reject(new Error(statusData.error || 'Error durante el análisis'));
                } else if (statusData.status === 'pending' || statusData.status === 'processing') {
                    console.log(`[Polling] La tarea ${taskId} está en estado: ${statusData.status}...`);
                }
            } catch (err) {
                failedAttempts++;
                console.warn(`[Polling] Advertencia: Error de red. Intento fallido ${failedAttempts}/5`, err);
                if (failedAttempts >= 5) {
                    clearInterval(interval);
                    reject(err);
                }
            }
        }, 5000);
    });
  },
};

export const AnalysisHistoryService = {
  async getAll(): Promise<AnalysisSession[]> {
    const response = await fetch(`${API_BASE_URL}/historial_analisis`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      throw new Error(`Error al obtener el historial de análisis: ${response.status}`);
    }
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      if (text.toLowerCase().includes('<!doctype html>')) {
        throw new Error(`El servidor se está reiniciando o no está disponible temporalmente. Intente nuevamente en unos segundos.`);
      }
      throw new Error(`Se esperaba JSON pero se recibió: ${contentType}. Contenido: ${text.substring(0, 100)}`);
    }

    const json = await response.json();
    const data = Array.isArray(json) ? json : (json.data || []);
    return data.map((item: any) => ({
      id: item.id_analisis,
      fecha: item.fecha_creacion || item.created_at || new Date().toISOString(),
      filename: item.nombre_archivo_licitacion || "",
      formData: {
        nombreProyecto: item.nombre_archivo_licitacion || "Proyecto",
        sector: item.sector ? item.sector.split(', ') : [],
        tipoContrato: item.tipo_contrato || "",
        categoria: [],
      },
      result: {
        archivo_licitacion: item.nombre_archivo_licitacion || "",
        normativas_cargadas: item.normativas_cargadas || [],
        proyecto: item.nombre_archivo_licitacion || "",
        sector: item.sector || "",
        categoria: "",
        origen_data: item.origen_data || "",
        status: item.status || "",
        mensaje: item.mensaje || "",
        id_analisis: item.id_analisis,
        url_descarga_pdf: item.url_descarga_pdf,
        url_descarga_excel: item.url_descarga_excel,
        resultado: {
          riesgos_detectados: [], // To be fetched when clicking
          resumen_ejecutivo: item.resumen_ejecutivo,
        },
      },
      total_riesgos: item.total_riesgos,
    }));
  },

  async getById(id: string): Promise<AnalysisSession> {
    try {
      const response = await fetch(`${API_BASE_URL}/historial/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        throw new Error(`Error al obtener detalle del análisis: ${response.status}`);
      }
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        if (text.toLowerCase().includes('<!doctype html>')) {
          throw new Error(`El servidor se está reiniciando o no está disponible temporalmente. Intente nuevamente en unos segundos.`);
        }
        throw new Error(`Se esperaba JSON pero se recibió: ${contentType}. Contenido: ${text.substring(0, 100)}`);
      }

      const item = await response.json();
      return {
        id: item.id_analisis,
        fecha: item.fecha_creacion || item.created_at || new Date().toISOString(),
        filename: item.nombre_base_proyecto || "",
        formData: {
          nombreProyecto: item.nombre_base_proyecto || "Proyecto",
          sector: item.sector ? item.sector.split(', ') : [],
          tipoContrato: item.tipo_contrato || "",
          categoria: [],
        },
        result: {
          archivo_licitacion: item.nombre_base_proyecto || "",
          normativas_cargadas: [],
          proyecto: item.nombre_base_proyecto || "",
          sector: item.sector || "",
          categoria: "",
          origen_data: "Database",
          status: "success",
          mensaje: item.mensaje || "",
          id_analisis: item.id_analisis,
          url_descarga_pdf: "",
          url_descarga_excel: item.url_descarga_excel,
          resultado: {
            riesgos_detectados: item.riesgos || [],
            resumen_ejecutivo: item.resumen_ejecutivo,
          },
        },
        isFullyLoaded: true,
        total_riesgos: item.riesgos?.length || 0,
      };
    } catch (error) {
      console.error("Could not fetch session details from backend.", error);
      throw error;
    }
  },

  async create(session: AnalysisSession): Promise<AnalysisSession> {
    const response = await fetch(`${API_BASE_URL}/historial_analisis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(session),
    });

    if (!response.ok) {
      throw new Error(
        `Error al crear sesión en el historial: ${response.status}`,
      );
    }

    return response.json();
  },

  async update(
    id: string | number,
    session: AnalysisSession,
  ): Promise<AnalysisSession> {
    const response = await fetch(`${API_BASE_URL}/historial_analisis/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(session),
    });

    if (!response.ok) {
      throw new Error(
        `Error al actualizar sesión en el historial: ${response.status}`,
      );
    }

    return response.json();
  },

  async delete(id: string | number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/historial_analisis/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Error al eliminar sesión del historial: ${response.status}`,
      );
    }
  },
};

export const RiesgosService = {
  async getAll(): Promise<Riesgo[]> {
    const response = await fetch(`${API_BASE_URL}/base_conocimiento_riesgos`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener los riesgos: ${response.status}`);
    }

    return response.json();
  },

  async create(riesgo: Riesgo): Promise<Riesgo> {
    const response = await fetch(`${API_BASE_URL}/base_conocimiento_riesgos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(riesgo),
    });

    if (!response.ok) {
      throw new Error(`Error al crear el riesgo: ${response.status}`);
    }

    return response.json();
  },

  async update(id: string | number, riesgo: Riesgo): Promise<Riesgo> {
    const response = await fetch(
      `${API_BASE_URL}/base_conocimiento_riesgos/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(riesgo),
      },
    );

    if (!response.ok) {
      throw new Error(`Error al actualizar el riesgo: ${response.status}`);
    }

    return response.json();
  },

  async delete(id: string | number): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/base_conocimiento_riesgos/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error al eliminar el riesgo: ${response.status}`);
    }
  },
};

export const ConfigPromptsService = {
  async getAll(): Promise<ConfigPrompt[]> {
    const response = await fetch(`${API_BASE_URL}/config-prompts`);
    if (!response.ok) throw new Error("Error al obtener configuraciones");
    return response.json();
  },

  async create(data: Omit<ConfigPrompt, 'id'>): Promise<ConfigPrompt> {
    const response = await fetch(`${API_BASE_URL}/config-prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Error al guardar prompt");
    return response.json();
  },

  async update(id: string, data: Partial<ConfigPrompt>): Promise<ConfigPrompt> {
    const response = await fetch(`${API_BASE_URL}/config-prompts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Error al actualizar prompt");
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/config-prompts/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Error al eliminar prompt");
  }
};
