import { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, Check, X, ShieldAlert, BookOpen, AlertCircle, Filter, FilterX, ChevronDown, ChevronUp } from 'lucide-react';
import { Riesgo } from '@/types';
import { useToast } from '@/components/ToastProvider';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';

interface BaseConocimientoProps {
  savedRiesgos: Riesgo[];
  onManualEntry: (riesgo: Riesgo) => void;
  onEditRiesgo: (updatedRiesgo: Riesgo) => Promise<void>;
  onDeleteRiesgo: (numero_riesgo: string) => void;
}

export default function BaseConocimiento({
  savedRiesgos,
  onManualEntry,
  onEditRiesgo,
  onDeleteRiesgo,
}: BaseConocimientoProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipoContrato, setSelectedTipoContrato] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<string[]>([]);
  const [selectedSubcategoria, setSelectedSubcategoria] = useState<string[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Form states for manual addition
  const [newRiesgo, setNewRiesgo] = useState<any>({
    sector: [],
    tipo_contrato: '',
    categoria: '',
    subcategoria: '',
    riesgo_identificado: '',
    foco_revision: '',
    sustento_legal_normativo: '',
    nivel_sustento_documental: 'MANUAL',
    alerta_sistema: 'Ingresado de forma manual en biblioteca.',
  });

  const toggleRow = (numero_riesgo: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(numero_riesgo)) {
        next.delete(numero_riesgo);
      } else {
        next.add(numero_riesgo);
      }
      return next;
    });
  };

  // Edit states
  const [editForm, setEditForm] = useState<any>({});

  // Helper to check if a value matches a multi-select filter
  const matchesFilter = (value: string | undefined, filter: string[]) => {
    if (filter.length === 0) return true;
    if (!value) return false;
    const values = value.split(', ').map(v => v.trim().toUpperCase());
    return filter.some(f => values.includes(f.toUpperCase()));
  };

  // Filter options lists (Correlative)
  const tiposContratoOptions = useMemo(() => {
    let filtered = savedRiesgos;
    if (selectedSector.length > 0) filtered = filtered.filter(r => matchesFilter(r.sector, selectedSector));
    if (selectedCategoria.length > 0) filtered = filtered.filter(r => selectedCategoria.includes(r.categoria));
    if (selectedSubcategoria.length > 0) filtered = filtered.filter(r => selectedSubcategoria.includes(r.subcategoria));
    const types = Array.from(new Set(filtered.map(r => r.tipo_contrato))).filter(Boolean);
    return types.map(t => ({ label: t, value: t }));
  }, [savedRiesgos, selectedSector, selectedCategoria, selectedSubcategoria]);

  const sectoresOptions = useMemo(() => {
    let filtered = savedRiesgos;
    if (selectedTipoContrato.length > 0) filtered = filtered.filter(r => selectedTipoContrato.includes(r.tipo_contrato));
    if (selectedCategoria.length > 0) filtered = filtered.filter(r => selectedCategoria.includes(r.categoria));
    if (selectedSubcategoria.length > 0) filtered = filtered.filter(r => selectedSubcategoria.includes(r.subcategoria));
    const sectors = Array.from(new Set(filtered.flatMap(r => r.sector ? r.sector.split(', ') : []))).filter(Boolean);
    return sectors.map(s => ({ label: s, value: s }));
  }, [savedRiesgos, selectedTipoContrato, selectedCategoria, selectedSubcategoria]);

  const categoriasOptions = useMemo(() => {
    let filtered = savedRiesgos;
    if (selectedTipoContrato.length > 0) filtered = filtered.filter(r => selectedTipoContrato.includes(r.tipo_contrato));
    if (selectedSector.length > 0) filtered = filtered.filter(r => matchesFilter(r.sector, selectedSector));
    if (selectedSubcategoria.length > 0) filtered = filtered.filter(r => selectedSubcategoria.includes(r.subcategoria));
    const cats = Array.from(new Set(filtered.map(r => r.categoria))).filter(Boolean);
    return cats.map(c => ({ label: c, value: c }));
  }, [savedRiesgos, selectedTipoContrato, selectedSector, selectedSubcategoria]);

  const subcategoriasOptions = useMemo(() => {
    let filtered = savedRiesgos;
    if (selectedTipoContrato.length > 0) filtered = filtered.filter(r => selectedTipoContrato.includes(r.tipo_contrato));
    if (selectedSector.length > 0) filtered = filtered.filter(r => matchesFilter(r.sector, selectedSector));
    if (selectedCategoria.length > 0) filtered = filtered.filter(r => selectedCategoria.includes(r.categoria));
    const subs = Array.from(new Set(filtered.map(r => r.subcategoria))).filter(Boolean);
    return subs.map(s => ({ label: s, value: s }));
  }, [savedRiesgos, selectedTipoContrato, selectedSector, selectedCategoria]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTipoContrato([]);
    setSelectedSector([]);
    setSelectedCategoria([]);
    setSelectedSubcategoria([]);
  };

  // Handle addition
  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiesgo.riesgo_identificado?.trim()) {
      showToast('Por favor complete la descripción del riesgo.', 'warning');
      return;
    }
    const finalRiesgo: Riesgo = {
      numero_riesgo: '', // autogenerated in App
      sector: Array.isArray(newRiesgo.sector) ? newRiesgo.sector.join(', ') : (newRiesgo.sector || ''),
      tipo_contrato: newRiesgo.tipo_contrato || '',
      categoria: newRiesgo.categoria || '',
      subcategoria: newRiesgo.subcategoria || '',
      riesgo_identificado: newRiesgo.riesgo_identificado,
      foco_revision: newRiesgo.foco_revision || '',
      nombre_archivo_licitacion: newRiesgo.nombre_archivo_licitacion || '',
      seccion_bases: newRiesgo.seccion_bases || '',
      pagina_pdf: newRiesgo.pagina_pdf || null,
      nombre_archivo_normativa: newRiesgo.nombre_archivo_normativa || '',
      contexto_parrafo: newRiesgo.contexto_parrafo || '',
      evidencia_licitacion: newRiesgo.evidencia_licitacion || '',
      fragmento_literal_fuente: newRiesgo.fragmento_literal_fuente || '',
      sustento_legal_normativo: newRiesgo.sustento_legal_normativo || '',
      nivel_sustento_documental: newRiesgo.nivel_sustento_documental || 'MANUAL',
      alerta_sistema: newRiesgo.alerta_sistema || 'Ingresado de forma manual en biblioteca.',
      created_at: new Date().toISOString(),
      activo: true,
    };
    onManualEntry(finalRiesgo);
    setIsAddingNew(false);
    setNewRiesgo({
      sector: [],
      tipo_contrato: '',
      categoria: '',
      subcategoria: '',
      riesgo_identificado: '',
      foco_revision: '',
      nombre_archivo_licitacion: '',
      seccion_bases: '',
      pagina_pdf: undefined,
      nombre_archivo_normativa: '',
      contexto_parrafo: '',
      evidencia_licitacion: '',
      fragmento_literal_fuente: '',
      sustento_legal_normativo: '',
      nivel_sustento_documental: 'MANUAL',
      alerta_sistema: 'Ingresado de forma manual en biblioteca.',
    });
    showToast('Riesgo manual agregado con éxito.', 'success');
  };

  // Start edit mode
  const handleStartEdit = (riesgo: Riesgo) => {
    setEditingId(riesgo.numero_riesgo);
    const sectorArr = riesgo.sector ? riesgo.sector.split(', ') : [];
    setEditForm({ ...riesgo, sector: sectorArr as any });
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Submit edit
  const handleSaveEdit = async () => {
    if (!editForm.riesgo_identificado?.trim()) {
      showToast('La descripción del riesgo no puede estar vacía.', 'warning');
      return;
    }
    const finalEditForm = {
      ...editForm,
      sector: Array.isArray(editForm.sector) ? editForm.sector.join(', ') : (editForm.sector || '')
    };
    await onEditRiesgo(finalEditForm as Riesgo);
    setEditingId(null);
    setEditForm({});
    showToast('Riesgo actualizado con éxito.', 'success');
  };

  // Handle deletion
  const handleDelete = (numero_riesgo: string) => {
    onDeleteRiesgo(numero_riesgo);
  };

  // Filter list
  const filteredRiesgos = useMemo(() => {
    return savedRiesgos.filter(r => {
      const riesgoIdentificado = r.riesgo_identificado || '';
      const numeroRiesgo = r.numero_riesgo || '';
      const sustento = r.sustento_legal_normativo || '';
      
      const matchesSearch =
        riesgoIdentificado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        numeroRiesgo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sustento.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSector = matchesFilter(r.sector, selectedSector);
      const matchesTipoContrato = selectedTipoContrato.length === 0 || selectedTipoContrato.includes(r.tipo_contrato);
      const matchesCategoria = selectedCategoria.length === 0 || selectedCategoria.includes(r.categoria);
      const matchesSubcategoria = selectedSubcategoria.length === 0 || selectedSubcategoria.includes(r.subcategoria);

      return matchesSearch && matchesSector && matchesTipoContrato && matchesCategoria && matchesSubcategoria;
    });
  }, [savedRiesgos, searchTerm, selectedSector, selectedTipoContrato, selectedCategoria, selectedSubcategoria]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            Base de Conocimiento
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Biblioteca local y repositorio de riesgos alimentados por análisis automatizados y registros manuales.
          </p>
        </div>
        <button
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          {isAddingNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAddingNew ? 'Cancelar Registro' : 'Registrar Riesgo'}
        </button>
      </div>

      {/* Manual creation form */}
      {isAddingNew && (
        <form onSubmit={handleAddNewSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5 animate-fade-in">
          <h2 className="text-lg font-bold text-slate-900">Agregar Nuevo Riesgo Manual</h2>
          
          <datalist id="list-sectores">
            {sectoresOptions.map(opt => <option key={opt.value} value={opt.value} />)}
          </datalist>
          <datalist id="list-tipos">
            {tiposContratoOptions.map(opt => <option key={opt.value} value={opt.value} />)}
          </datalist>
          <datalist id="list-categorias">
            {categoriasOptions.map(opt => <option key={opt.value} value={opt.value} />)}
          </datalist>
          <datalist id="list-subcategorias">
            {subcategoriasOptions.map(opt => <option key={opt.value} value={opt.value} />)}
          </datalist>
          <datalist id="list-focos">
            {Array.from(new Set(savedRiesgos.map(r => r.foco_revision))).filter(Boolean).map(f => <option key={f} value={f} />)}
          </datalist>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Contrato *</label>
              <input
                list="list-tipos"
                type="text"
                value={newRiesgo.tipo_contrato}
                onChange={e => setNewRiesgo({ ...newRiesgo, tipo_contrato: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Ej. CONSTRUCCION"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sector *</label>
              <MultiSelectDropdown 
                options={sectoresOptions}
                selected={Array.isArray(newRiesgo.sector) ? newRiesgo.sector : []}
                onChange={(selected) => setNewRiesgo({ ...newRiesgo, sector: selected })}
                placeholder="Seleccione sector(es)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría *</label>
              <input
                list="list-categorias"
                type="text"
                value={newRiesgo.categoria}
                onChange={e => setNewRiesgo({ ...newRiesgo, categoria: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Ej. LEGAL"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Subcategoría *</label>
              <input
                list="list-subcategorias"
                type="text"
                value={newRiesgo.subcategoria}
                onChange={e => setNewRiesgo({ ...newRiesgo, subcategoria: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Ej. CONTROVERSIAS"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Foco de Revisión *</label>
              <input
                list="list-focos"
                type="text"
                value={newRiesgo.foco_revision}
                onChange={e => setNewRiesgo({ ...newRiesgo, foco_revision: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Ej. TECNICO"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Archivo de Licitación</label>
              <input
                type="text"
                value={newRiesgo.nombre_archivo_licitacion || ''}
                onChange={e => setNewRiesgo({ ...newRiesgo, nombre_archivo_licitacion: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Nombre del archivo de licitación..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sección Bases</label>
              <input
                type="text"
                value={newRiesgo.seccion_bases || ''}
                onChange={e => setNewRiesgo({ ...newRiesgo, seccion_bases: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Ej. Numeral 3.1..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Página PDF</label>
              <input
                type="number"
                value={newRiesgo.pagina_pdf || ''}
                onChange={e => setNewRiesgo({ ...newRiesgo, pagina_pdf: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Número de página"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Archivo Normativa</label>
              <input
                type="text"
                value={newRiesgo.nombre_archivo_normativa || ''}
                onChange={e => setNewRiesgo({ ...newRiesgo, nombre_archivo_normativa: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Nombre de archivo de normativa..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción del Riesgo Identificado *</label>
            <textarea
              rows={3}
              value={newRiesgo.riesgo_identificado}
              onChange={e => setNewRiesgo({ ...newRiesgo, riesgo_identificado: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Describa el hallazgo o contingencia legal/técnica..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sustento Legal / Normativa (Opcional)</label>
            <textarea
              rows={3}
              value={newRiesgo.sustento_legal_normativo || ''}
              onChange={e => setNewRiesgo({ ...newRiesgo, sustento_legal_normativo: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Leyes, reglamentos o bases que sustentan este riesgo..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contexto del Párrafo</label>
              <textarea
                rows={3}
                value={newRiesgo.contexto_parrafo || ''}
                onChange={e => setNewRiesgo({ ...newRiesgo, contexto_parrafo: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Evidencia en Licitación</label>
              <textarea
                rows={3}
                value={newRiesgo.evidencia_licitacion || ''}
                onChange={e => setNewRiesgo({ ...newRiesgo, evidencia_licitacion: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Fragmento Literal de Fuente</label>
              <textarea
                rows={3}
                value={newRiesgo.fragmento_literal_fuente || ''}
                onChange={e => setNewRiesgo({ ...newRiesgo, fragmento_literal_fuente: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              Guardar en Biblioteca
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
        {/* Top row: Search and clear filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center w-full">
          {/* Search */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, descripción o sustento legal..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400 transition-all focus:bg-white"
            />
          </div>
          
          {/* Clear Filters Button */}
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
            title="Limpiar filtros"
          >
            <FilterX className="w-4 h-4" />
            <span className="hidden md:inline">Limpiar</span>
          </button>
        </div>

        {/* Bottom row: Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          
          {/* Tipo Contrato Filter */}
          <div className="w-full sm:w-auto flex-1 min-w-[180px]">
            <MultiSelectDropdown 
              options={tiposContratoOptions}
              selected={selectedTipoContrato}
              onChange={(selected) => setSelectedTipoContrato(selected)}
              placeholder="Contratos (Todos)"
            />
          </div>

          {/* Sector Filter */}
          <div className="w-full sm:w-auto flex-1 min-w-[200px]">
            <MultiSelectDropdown 
              options={sectoresOptions}
              selected={selectedSector}
              onChange={(selected) => setSelectedSector(selected)}
              placeholder="Sectores (Todos)"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-auto flex-1 min-w-[180px]">
            <MultiSelectDropdown 
              options={categoriasOptions}
              selected={selectedCategoria}
              onChange={(selected) => setSelectedCategoria(selected)}
              placeholder="Categorías (Todas)"
            />
          </div>

          {/* Subcategory Filter */}
          <div className="w-full sm:w-auto flex-1 min-w-[180px]">
            <MultiSelectDropdown 
              options={subcategoriasOptions}
              selected={selectedSubcategoria}
              onChange={(selected) => setSelectedSubcategoria(selected)}
              placeholder="Subcategorías (Todas)"
            />
          </div>
        </div>
      </div>

      {/* List results */}
      {filteredRiesgos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-md mx-auto">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Sin resultados</h3>
          <p className="text-sm text-slate-500 mt-2">
            No encontramos ningún riesgo que coincida con los filtros aplicados o tu consulta actual.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRiesgos.map((riesgo) => {
            const isEditing = editingId === riesgo.numero_riesgo;
            return (
              <div
                key={riesgo.numero_riesgo}
                className={`bg-white rounded-2xl border transition-all p-5 sm:p-6 ${
                  isEditing ? 'border-indigo-500 ring-2 ring-indigo-500/15 shadow-md' : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {isEditing ? (
                  /* EDITING MODE FORM */
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <span className="text-sm font-mono font-bold text-slate-500">{riesgo.numero_riesgo}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                          title="Guardar Cambios"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contrato</label>
                        <input
                          type="text"
                          value={editForm.tipo_contrato || ''}
                          onChange={e => setEditForm({ ...editForm, tipo_contrato: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sector</label>
                        <MultiSelectDropdown 
                          options={sectoresOptions}
                          selected={Array.isArray(editForm.sector) ? editForm.sector : []}
                          onChange={(selected) => setEditForm({ ...editForm, sector: selected })}
                          placeholder="Sectores"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Categoría</label>
                        <input
                          type="text"
                          value={editForm.categoria || ''}
                          onChange={e => setEditForm({ ...editForm, categoria: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subcategoría</label>
                        <input
                          type="text"
                          value={editForm.subcategoria || ''}
                          onChange={e => setEditForm({ ...editForm, subcategoria: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Foco de Revisión</label>
                        <input
                          type="text"
                          value={editForm.foco_revision || ''}
                          onChange={e => setEditForm({ ...editForm, foco_revision: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sección Bases</label>
                        <input
                          type="text"
                          value={editForm.seccion_bases || ''}
                          onChange={e => setEditForm({ ...editForm, seccion_bases: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Página PDF</label>
                        <input
                          type="number"
                          value={editForm.pagina_pdf || ''}
                          onChange={e => setEditForm({ ...editForm, pagina_pdf: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Archivo Licitación</label>
                        <input
                          type="text"
                          value={editForm.nombre_archivo_licitacion || ''}
                          onChange={e => setEditForm({ ...editForm, nombre_archivo_licitacion: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Archivo Normativa</label>
                        <input
                          type="text"
                          value={editForm.nombre_archivo_normativa || ''}
                          onChange={e => setEditForm({ ...editForm, nombre_archivo_normativa: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Riesgo Identificado</label>
                      <textarea
                        rows={2}
                        value={editForm.riesgo_identificado || ''}
                        onChange={e => setEditForm({ ...editForm, riesgo_identificado: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sustento Legal / Normativa</label>
                      <textarea
                        rows={2}
                        value={editForm.sustento_legal_normativo || ''}
                        onChange={e => setEditForm({ ...editForm, sustento_legal_normativo: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contexto Párrafo</label>
                        <textarea
                          rows={2}
                          value={editForm.contexto_parrafo || ''}
                          onChange={e => setEditForm({ ...editForm, contexto_parrafo: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Evidencia Licitación</label>
                        <textarea
                          rows={2}
                          value={editForm.evidencia_licitacion || ''}
                          onChange={e => setEditForm({ ...editForm, evidencia_licitacion: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fragmento Fuente</label>
                        <textarea
                          rows={2}
                          value={editForm.fragmento_literal_fuente || ''}
                          onChange={e => setEditForm({ ...editForm, fragmento_literal_fuente: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* VIEW MODE */
                  <div className="space-y-4">
                    {/* Upper row: Tag metadata and actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 cursor-pointer" onClick={() => toggleRow(riesgo.numero_riesgo)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                          {riesgo.numero_riesgo}
                        </span>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {riesgo.tipo_contrato}
                        </span>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {riesgo.sector}
                        </span>
                        <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg">
                          {riesgo.categoria}
                        </span>
                        {riesgo.subcategoria && (
                          <span className="text-xs font-semibold text-indigo-500/80 bg-indigo-50/50 px-2.5 py-1 rounded-lg border border-indigo-100">
                            {riesgo.subcategoria}
                          </span>
                        )}
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(riesgo); }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar Riesgo"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(riesgo.numero_riesgo); }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar de Biblioteca"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          {expandedRows.has(riesgo.numero_riesgo) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Main texts */}
                    <div 
                      className="flex flex-col gap-4 pt-1 cursor-pointer"
                      onClick={() => toggleRow(riesgo.numero_riesgo)}
                    >
                      {/* Top: Risk Text */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Riesgo Identificado</h4>
                        <p className="text-slate-800 font-semibold text-sm sm:text-base leading-relaxed whitespace-pre-line">
                          {riesgo.riesgo_identificado}
                        </p>
                        {expandedRows.has(riesgo.numero_riesgo) && riesgo.alerta_sistema && (
                          <div className="flex items-start gap-2 text-xs bg-slate-50 text-slate-600 p-3 rounded-xl border border-slate-100 mt-3">
                            <AlertCircle className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                            <span><strong>Observación:</strong> {riesgo.alerta_sistema}</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom: Sustento text */}
                      {expandedRows.has(riesgo.numero_riesgo) && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-2 cursor-default" onClick={e => e.stopPropagation()}>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sustento Legal y Contexto</h4>
                          {riesgo.sustento_legal_normativo ? (
                            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                              {riesgo.sustento_legal_normativo}
                            </p>
                          ) : (
                            <p className="text-slate-400 text-xs italic">
                              No se ingresó sustento legal para este riesgo.
                            </p>
                          )}

                          {/* File names and locations if available */}
                          {(riesgo.nombre_archivo_licitacion || riesgo.nombre_archivo_normativa || riesgo.seccion_bases) && (
                            <div className="text-[10px] text-slate-400 space-y-1 pt-2 border-t border-slate-100/60 mt-2">
                              {riesgo.nombre_archivo_licitacion && (
                                <p className="truncate"><strong>Licitación:</strong> {riesgo.nombre_archivo_licitacion} {riesgo.pagina_pdf ? `(Pág. ${riesgo.pagina_pdf})` : ''} {riesgo.seccion_bases ? `[${riesgo.seccion_bases}]` : ''}</p>
                              )}
                              {(!riesgo.nombre_archivo_licitacion && riesgo.seccion_bases) && (
                                <p className="truncate"><strong>Sección Bases:</strong> {riesgo.seccion_bases} {riesgo.pagina_pdf ? `(Pág. ${riesgo.pagina_pdf})` : ''}</p>
                              )}
                              {riesgo.nombre_archivo_normativa && (
                                <p className="truncate"><strong>Normativa:</strong> {riesgo.nombre_archivo_normativa}</p>
                              )}
                            </div>
                          )}
                          
                          {(riesgo.contexto_parrafo || riesgo.evidencia_licitacion || riesgo.fragmento_literal_fuente) && (
                            <div className="pt-2 border-t border-slate-100/60 mt-2 space-y-2">
                              {riesgo.contexto_parrafo && (
                                <div>
                                  <strong className="text-[10px] uppercase text-slate-400">Contexto Párrafo:</strong>
                                  <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">{riesgo.contexto_parrafo}</p>
                                </div>
                              )}
                              {riesgo.evidencia_licitacion && (
                                <div>
                                  <strong className="text-[10px] uppercase text-slate-400">Evidencia Licitación:</strong>
                                  <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">{riesgo.evidencia_licitacion}</p>
                                </div>
                              )}
                              {riesgo.fragmento_literal_fuente && (
                                <div>
                                  <strong className="text-[10px] uppercase text-slate-400">Fragmento Fuente:</strong>
                                  <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">{riesgo.fragmento_literal_fuente}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
