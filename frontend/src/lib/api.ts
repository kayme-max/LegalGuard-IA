import { Riesgo, BackendResponse } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const AnalysisService = {
  async procesar(formData: FormData): Promise<BackendResponse> {
    const response = await fetch(`${API_BASE_URL}/analizar`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorMsg = await response.text().catch(() => 'Error al procesar el análisis');
      throw new Error(errorMsg || `Error en el servidor: ${response.status}`);
    }

    return response.json();
  }
};

export const RiesgosService = {
  async getAll(): Promise<Riesgo[]> {
    const response = await fetch(`${API_BASE_URL}/base_conocimiento_riesgos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener los riesgos: ${response.status}`);
    }

    return response.json();
  },

  async create(riesgo: Riesgo): Promise<Riesgo> {
    const response = await fetch(`${API_BASE_URL}/base_conocimiento_riesgos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(riesgo),
    });

    if (!response.ok) {
      throw new Error(`Error al crear el riesgo: ${response.status}`);
    }

    return response.json();
  },

  async update(id: string | number, riesgo: Riesgo): Promise<Riesgo> {
    const response = await fetch(`${API_BASE_URL}/base_conocimiento_riesgos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(riesgo),
    });

    if (!response.ok) {
      throw new Error(`Error al actualizar el riesgo: ${response.status}`);
    }

    return response.json();
  },

  async delete(id: string | number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/base_conocimiento_riesgos/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error al eliminar el riesgo: ${response.status}`);
    }
  }
};
