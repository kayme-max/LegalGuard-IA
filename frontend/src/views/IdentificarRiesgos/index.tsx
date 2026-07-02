import { useState, useRef, useMemo } from 'react';
import { AlertTriangle, Search, Building, BookOpen, FileText, UploadCloud, Trash2, Globe, Plus, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import { AnalysisSession } from '@/types';
import { AnalysisService } from '@/lib/api';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import { motion } from 'motion/react';
import { useToast } from '@/components/ToastProvider';
import { PDFDocument } from 'pdf-lib';
import { useEffect } from 'react';

import { Riesgo } from '@/types';

interface IdentificarRiesgosProps {
  savedRiesgos: Riesgo[];
  onNavigateToHistorial: (id?: string) => void;
  onAnalysisComplete: (session: AnalysisSession) => void;
}

export default function IdentificarRiesgos({ savedRiesgos, onNavigateToHistorial, onAnalysisComplete }: IdentificarRiesgosProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    nombreProyecto: '',
    sector: [] as string[],
    tipoContrato: '',
    categoria: [] as string[],
    subcategoria: [] as string[],
    promptContexto: '',
  });

  const [mainDocuments, setMainDocuments] = useState<File[]>([]);
  const [licitacionPageCounts, setLicitacionPageCounts] = useState<Record<string, number>>({});

  const [normativas, setNormativas] = useState<File[]>([]);
  const [normativasPageCounts, setNormativasPageCounts] = useState<Record<string, number>>({});
  
  const [enlaces, setEnlaces] = useState<string[]>([]);
  const [currentEnlace, setCurrentEnlace] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const totalMainPages = useMemo(() => {
    return mainDocuments.reduce((acc, f) => acc + (licitacionPageCounts[f.name] || 0), 0);
  }, [mainDocuments, licitacionPageCounts]);

  const totalNormativasPages = useMemo(() => {
    return normativas.reduce((acc, f) => acc + (normativasPageCounts[f.name] || 0), 0);
  }, [normativas, normativasPageCounts]);

  const getTipoContratoOptions = () => {
    return Array.from(new Set(savedRiesgos.map(r => r.tipo_contrato))).filter(Boolean).sort() as string[];
  };

  const getSectorOptions = () => {
    const filtered = savedRiesgos.filter(r => !formData.tipoContrato || r.tipo_contrato === formData.tipoContrato);
    return Array.from(new Set(filtered.map(r => r.sector)))
      .filter(Boolean)
      .sort()
      .map(sector => ({ label: sector as string, value: sector as string }));
  };

  const getCategoriaOptions = () => {
    const filtered = savedRiesgos.filter(r => 
      (!formData.tipoContrato || r.tipo_contrato === formData.tipoContrato) &&
      (formData.sector.length === 0 || (r.sector && formData.sector.some(s => r.sector.includes(s))))
    );
    const options = Array.from(new Set(filtered.map(r => r.categoria))).filter(Boolean).sort() as string[];
    return options.map(opt => ({ label: opt, value: opt }));
  };

  const licitacionInputRef = useRef<HTMLInputElement>(null);
  const normativasInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'licitacion' | 'normativas') => {
    const files = Array.from(e.target.files || []);
    if (type === 'licitacion') {
      const pdfs = files.filter(f => f.type === 'application/pdf');
      if (pdfs.length > 0) {
        const newCounts = { ...licitacionPageCounts };
        let currentTotal = mainDocuments.reduce((acc, f) => acc + (newCounts[f.name] || 0), 0);

        for (const file of pdfs) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const pageCount = pdfDoc.getPageCount();
            newCounts[file.name] = pageCount;
            currentTotal += pageCount;
          } catch (error) {
            newCounts[file.name] = 0;
            showToast(`Error leyendo las páginas de: ${file.name}`, "error");
          }
        }
        
        setLicitacionPageCounts(newCounts);
        setMainDocuments(prev => [...prev, ...pdfs]);
        
        if (currentTotal > 500) {
          showToast("El conjunto de documentos principales supera las 500 páginas. Tenga en cuenta los límites de la IA.", "warning");
        }
      } else if (files.length > 0) {
        showToast("Solo se permiten archivos PDF.", "warning");
      }
    } else {
      const pdfs = files.filter(f => f.type === 'application/pdf');
      if (pdfs.length > 0) {
        const newCounts = { ...normativasPageCounts };
        let newTotalPages = normativas.reduce((acc, f) => acc + (newCounts[f.name] || 0), 0);

        for (const file of pdfs) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const pageCount = pdfDoc.getPageCount();
            newCounts[file.name] = pageCount;
            newTotalPages += pageCount;
          } catch (error) {
            newCounts[file.name] = 0;
            showToast(`Error leyendo las páginas de: ${file.name}`, "error");
          }
        }
        
        setNormativasPageCounts(newCounts);
        setNormativas(prev => [...prev, ...pdfs]);

        if (newTotalPages > 1000) {
          showToast("El conjunto de normativas excede las 1000 páginas. Tenga en cuenta el costo por token del análisis de IA.", "warning");
        }
      } else if (files.length > 0) {
        showToast("Solo se permiten archivos PDF.", "warning");
      }
    }
    e.target.value = '';
  };

  const handleAddEnlace = () => {
    if (!currentEnlace) return;
    let url = currentEnlace.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
      new URL(url);
      if (!enlaces.includes(url)) {
        setEnlaces([...enlaces, url]);
        setCurrentEnlace('');
      }
    } catch (e) {
      // Handle invalid URL
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tipoContrato) {
      showToast("Por favor, seleccione un Tipo de Contrato", "warning");
      return;
    }
    if (formData.sector.length === 0) {
      showToast("Por favor, seleccione al menos un Sector", "warning");
      return;
    }
    if (mainDocuments.length === 0) {
      showToast("Por favor, suba al menos un documento de la licitación", "warning");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const apiFormData = new FormData();
      
      apiFormData.append('sector', formData.sector.join(', '));
      apiFormData.append('tipoContrato', formData.tipoContrato);
      apiFormData.append('nombreProyecto', formData.nombreProyecto || mainDocuments[0]?.name || 'Proyecto');
      
      if (formData.categoria && formData.categoria.length > 0) {
        apiFormData.append('categoria', formData.categoria.join(', '));
      }

      if (formData.subcategoria && formData.subcategoria.length > 0) {
        apiFormData.append('subcategoria', formData.subcategoria.join(', '));
      }
      
      if (formData.promptContexto) {
        apiFormData.append('promptContexto', formData.promptContexto);
      }
      
      mainDocuments.forEach(file => {
        apiFormData.append('mainDoc', file);
      });
      
      normativas.forEach(file => {
        apiFormData.append('normativas', file);
      });

      // Llamar directamente al servicio backend
      const response = await AnalysisService.procesar(apiFormData);

      const totalNormativasPages = Object.values(normativasPageCounts).reduce((a, b) => a + b, 0);

      const newSessionInfo = {
        id: response.id_analisis || new Date().getTime().toString(),
        fecha: new Date().toISOString(),
        filename: mainDocuments[0]?.name || 'Documentos Varios',
        formData: formData,
        paginasLicitacion: totalMainPages,
        paginasNormativas: totalNormativasPages,
        result: response,
        isFullyLoaded: true
      };
      
      onAnalysisComplete(newSessionInfo);
      setIsAnalyzing(false);
      
      // Limpiar el formulario para la próxima consulta
      setFormData({ nombreProyecto: '', sector: [], tipoContrato: '', categoria: [], subcategoria: [], promptContexto: '' });
      setMainDocuments([]);
      setLicitacionPageCounts({});
      setNormativasPageCounts({});
      setNormativas([]);
      setEnlaces([]);

      onNavigateToHistorial(newSessionInfo.id);
      showToast("Análisis completado exitosamente", "success");
    } catch (error) {
      console.error("Error al procesar el análisis", error);
      setIsAnalyzing(false);
      showToast("Hubo un error al procesar el análisis. Verifica que el servidor backend esté en ejecución.", "error");
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Search className="w-8 h-8 text-indigo-600" />
            Identificar Riesgos
          </h1>
          <p className="text-sm text-slate-500 mt-1">Análisis inteligente de contingencias legales, técnicas y procedimentales</p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <button 
            type="button" 
            onClick={() => {
              setFormData({ nombreProyecto: '', sector: [], tipoContrato: '', categoria: [], subcategoria: [], promptContexto: '' });
              setMainDocuments([]);
              setLicitacionPageCounts({});
              setNormativasPageCounts({});
              setNormativas([]);
              setEnlaces([]);
            }}
            className="px-6 py-2.5 text-slate-700 font-medium bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-lg transition-colors"
          >
            Limpiar
          </button>
          <button 
            type="submit" 
            form="analyze-form"
            disabled={isAnalyzing}
            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><ArrowLeft className="w-5 h-5" /></motion.div>}
            <span>{isAnalyzing ? 'Auditando...' : 'Iniciar Auditoría'}</span>
          </button>
        </div>
      </div>

      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full z-10 overflow-hidden transform scale-100 transition-all border border-slate-100 p-8 flex flex-col items-center text-center">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} className="mb-6">
              <Search className="w-16 h-16 text-indigo-600" />
            </motion.div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Auditando Licitación</h3>
            <p className="text-slate-600 mb-4">El motor inteligente de auditoría jurídica está analizando los documentos...</p>
            
            <div className="bg-slate-50 border border-slate-200 rounded-lg py-3 px-6 inline-flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              <span className="text-xl font-mono text-slate-800 font-semibold">
                {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
            
            <p className="text-xs text-slate-400 mt-6">Este proceso puede tardar varios minutos dependiendo del volumen documental.</p>
          </div>
        </div>
      )}

      <form id="analyze-form" onSubmit={handleAnalyze} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible">
          <div className="bg-slate-50 p-4 border-b rounded-t-xl border-slate-200 flex items-center gap-2">
            <Building className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Información del Proyecto</h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre / Base del Proyecto <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                required
                placeholder="Ej. Mejora de Infraestructura 2026..."
                value={formData.nombreProyecto}
                onChange={e => setFormData({...formData, nombreProyecto: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de Contrato <span className="text-red-500">*</span>
              </label>
              <select 
                required
                value={formData.tipoContrato}
                onChange={e => setFormData({...formData, tipoContrato: e.target.value, sector: [], categoria: []})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white"
              >
                <option value="">Seleccione un tipo de contrato...</option>
                {getTipoContratoOptions().map((tipo, i) => (
                  <option key={i} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sector <span className="text-red-500">*</span>
              </label>
              <MultiSelectDropdown 
                options={getSectorOptions()}
                selected={formData.sector}
                onChange={(selected) => setFormData({...formData, sector: selected, categoria: []})}
                placeholder="-- Seleccione --"
                disabled={!formData.tipoContrato}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Categoría de riesgo
              </label>
              <MultiSelectDropdown 
                options={getCategoriaOptions()}
                selected={formData.categoria}
                onChange={(selected) => setFormData({...formData, categoria: selected})}
                placeholder="-- Todas --"
                disabled={!formData.tipoContrato}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Prompt / Contexto Adicional</h2>
          </div>
          <div className="p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ingrese contexto adicional para guiar el análisis de la IA
            </label>
            <textarea
              rows={4}
              placeholder="Ej. Tener en cuenta que este proyecto está en la fase de estructuración financiera y es crítico revisar los plazos..."
              value={formData.promptContexto}
              onChange={e => setFormData({...formData, promptContexto: e.target.value})}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white resize-y"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h2 className="font-semibold text-indigo-900">Documentación Principal (máximo 500 páginas)</h2>
            </div>
            {mainDocuments.length > 0 && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${totalMainPages > 500 ? 'bg-amber-200 text-amber-800' : 'bg-indigo-100 text-indigo-600'}`}>
                Total: {totalMainPages} páginas
              </span>
            )}
          </div>
          <div className="p-6">
            <input 
              type="file" 
              ref={licitacionInputRef}
              className="hidden" 
              accept=".pdf" 
              multiple 
              onChange={e => handleFileChange(e, 'licitacion')}
            />

            {mainDocuments.length === 0 ? (
              <div 
                onClick={() => licitacionInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors mb-4"
              >
                <UploadCloud className="w-8 h-8 mb-3 text-indigo-400" />
                <span className="text-sm text-slate-600 text-center font-medium">Haz clic para subir Documentos Principales</span>
                <span className="text-xs text-slate-400 mt-1">Puedes seleccionar varios archivos PDF</span>
              </div>
            ) : null}

            {mainDocuments.length > 0 && totalMainPages > 500 && (
              <div className="bg-amber-100/50 border border-amber-200 rounded p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  El conjunto de documentos principales excede las <strong>500 páginas</strong>. Tenga en cuenta los límites de procesamiento de la IA.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {mainDocuments.map((file, i) => (
                <div key={i} className={`flex items-center justify-between p-3 border rounded-lg shadow-sm bg-white ${licitacionPageCounts[file.name] === 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className={`w-6 h-6 shrink-0 ${licitacionPageCounts[file.name] === 0 ? 'text-red-400' : 'text-indigo-500'}`} />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-medium text-slate-700 truncate" title={file.name}>{file.name}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        {licitacionPageCounts[file.name] !== undefined && licitacionPageCounts[file.name] > 0 && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded">{licitacionPageCounts[file.name]} pág</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                        const newCounts = { ...licitacionPageCounts };
                        delete newCounts[file.name];
                        setLicitacionPageCounts(newCounts);
                        setMainDocuments(mainDocuments.filter((_, idx) => idx !== i));
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {mainDocuments.length > 0 && (
                <button
                  type="button"
                  onClick={() => licitacionInputRef.current?.click()}
                  className="flex items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-500 hover:text-indigo-600 gap-2 h-full min-h-[64px]"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-sm font-medium">Añadir PDF</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <h2 className="font-semibold text-slate-800">Normativas Aplicables (máximo 1000 páginas)</h2>
            </div>
            {normativas.length > 0 && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${totalNormativasPages > 1000 ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                Total: {totalNormativasPages} páginas
              </span>
            )}
          </div>
          <div className="p-6">
            <input 
              type="file" 
              ref={normativasInputRef}
              className="hidden" 
              accept=".pdf" 
              multiple 
              onChange={e => handleFileChange(e, 'normativas')}
            />

            {normativas.length === 0 ? (
              <div 
                onClick={() => normativasInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors mb-4"
              >
                <UploadCloud className="w-8 h-8 mb-3 text-slate-400" />
                <span className="text-sm text-slate-600 text-center font-medium">Haz clic para subir PDFs</span>
                <span className="text-xs text-slate-400 mt-1">Puedes seleccionar varios archivos a la vez</span>
              </div>
            ) : null}

            {normativas.length > 0 && normativas.reduce((acc, f) => acc + (normativasPageCounts[f.name] || 0), 0) > 1000 && (
              <div className="bg-amber-100/50 border border-amber-200 rounded p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  El conjunto de normativas excede las <strong>1000 páginas</strong>. Tenga en cuenta el costo por token que puede generar el análisis mediante IA y el tiempo de procesamiento.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {normativas.map((file, i) => (
                <div key={i} className={`flex items-center justify-between p-3 border rounded-lg shadow-sm bg-white ${normativasPageCounts[file.name] === 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className={`w-6 h-6 shrink-0 ${normativasPageCounts[file.name] === 0 ? 'text-red-400' : 'text-indigo-500'}`} />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-medium text-slate-700 truncate" title={file.name}>{file.name}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        {normativasPageCounts[file.name] !== undefined && normativasPageCounts[file.name] > 0 && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded">{normativasPageCounts[file.name]} pág</span>
                        )}
                        {normativasPageCounts[file.name] === 0 && (
                             <span className="text-[10px] text-red-600 font-semibold bg-red-100 px-1 rounded">Error</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                        const newCounts = { ...normativasPageCounts };
                        delete newCounts[file.name];
                        setNormativasPageCounts(newCounts);
                        setNormativas(normativas.filter((_, idx) => idx !== i));
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {normativas.length > 0 && (
                <button
                  type="button"
                  onClick={() => normativasInputRef.current?.click()}
                  className="flex items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-500 hover:text-indigo-600 gap-2 h-full min-h-[64px]"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-sm font-medium">Añadir PDF</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
            <Globe className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Enlaces Externos (Opcional)</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Globe className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Ej: www.elperuano.pe/normativa..." 
                  value={currentEnlace}
                  onChange={e => setCurrentEnlace(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddEnlace())}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                />
              </div>
              <button 
                type="button" 
                onClick={handleAddEnlace}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors border border-slate-300 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Añadir Enlace
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {enlaces.map((link, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <LinkIcon className="w-5 h-5 text-indigo-500 shrink-0" />
                    <a href={link} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:underline truncate">{link}</a>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setEnlaces(enlaces.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
