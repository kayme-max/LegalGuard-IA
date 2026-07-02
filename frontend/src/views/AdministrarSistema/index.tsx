import { useState, useEffect } from 'react';
import { Settings, Plus, Save, Trash2, Edit2, X, AlertCircle, FileCode, Search } from 'lucide-react';
import { ConfigPrompt } from '@/types';
import { ConfigPromptsService } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

export default function AdministrarSistema() {
  const { showToast } = useToast();
  const [prompts, setPrompts] = useState<ConfigPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Omit<ConfigPrompt, 'id' | 'created_at' | 'updated_at'>>({
    tipo_contrato: '',
    prompt_interno: ''
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setIsLoading(true);
      const data = await ConfigPromptsService.getAll();
      setPrompts(data);
    } catch (error) {
      showToast("Error al cargar las configuraciones", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.tipo_contrato || !formData.prompt_interno) {
      showToast("Por favor complete todos los campos", "warning");
      return;
    }

    try {
      if (isEditing) {
        await ConfigPromptsService.update(isEditing, formData);
        showToast("Prompt actualizado correctamente", "success");
      } else {
        await ConfigPromptsService.create(formData);
        showToast("Prompt creado correctamente", "success");
      }
      setIsEditing(null);
      setIsAdding(false);
      setFormData({ tipo_contrato: '', prompt_interno: '' });
      fetchPrompts();
    } catch (error: any) {
      showToast(error.message || "Error al guardar el prompt", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Está seguro de que desea eliminar esta configuración?")) return;

    try {
      await ConfigPromptsService.delete(id);
      showToast("Prompt eliminado", "info");
      fetchPrompts();
    } catch (error) {
      showToast("Error al eliminar el prompt", "error");
    }
  };

  const startEdit = (prompt: ConfigPrompt) => {
    setIsEditing(prompt.id);
    setIsAdding(false);
    setFormData({
      tipo_contrato: prompt.tipo_contrato,
      prompt_interno: prompt.prompt_interno
    });
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setIsAdding(false);
    setFormData({ tipo_contrato: '', prompt_interno: '' });
  };

  const filteredPrompts = prompts.filter(p => 
    p.tipo_contrato.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Administrar Sistema</h1>
            <p className="text-slate-500 mt-1">Gestión de prompts internos por tipo de contrato</p>
          </div>
        </div>
        
        <button
          onClick={() => {
            setIsAdding(true);
            setIsEditing(null);
            setFormData({ tipo_contrato: '', prompt_interno: '' });
          }}
          disabled={isAdding}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-md shadow-indigo-100 transition-all disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Nuevo Tipo de Contrato
        </button>
      </div>

      {/* Editor section */}
      {(isAdding || isEditing) && (
        <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden animate-in slide-in-from-top duration-300">
          <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              {isEditing ? 'Editar Configuración' : 'Nueva Configuración'}
            </h2>
            <button onClick={cancelEdit} className="text-indigo-400 hover:text-indigo-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Contrato</label>
                <input
                  type="text"
                  value={formData.tipo_contrato}
                  onChange={e => setFormData({ ...formData, tipo_contrato: e.target.value })}
                  placeholder="Ej: OBRA, SERVICIO, SUMINISTRO"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                />
                <p className="mt-1.5 text-xs text-slate-400">Este valor debe coincidir exactamente con la opción seleccionada en el formulario de identificación de riesgos.</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Prompt Interno (Instrucciones del Sistema)</label>
                <textarea
                  value={formData.prompt_interno}
                  onChange={e => setFormData({ ...formData, prompt_interno: e.target.value })}
                  rows={12}
                  placeholder="Escriba aquí las instrucciones detalladas que la IA debe seguir para este tipo de contrato..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm leading-relaxed"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={cancelEdit}
                className="px-6 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all"
              >
                <Save className="w-5 h-5" />
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-800">Prompts Configurados</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar contrato..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Contrato</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Última Actualización</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400">Cargando configuraciones...</td>
                </tr>
              ) : filteredPrompts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <p className="text-slate-500">No se encontraron prompts configurados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPrompts.map((prompt) => (
                  <tr key={prompt.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">
                          {prompt.tipo_contrato.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-700">{prompt.tipo_contrato}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {prompt.updated_at ? new Date(prompt.updated_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(prompt)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prompt.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900 text-sm">Información Importante</h4>
          <p className="text-sm text-amber-800 leading-relaxed">
            Los prompts configurados aquí se utilizarán como <strong>System Instructions</strong> en la API de Gemini durante el análisis de riesgos.
            Si un tipo de contrato no tiene un prompt configurado, se utilizará el prompt base predeterminado del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
