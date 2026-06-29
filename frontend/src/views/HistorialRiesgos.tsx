import { useState, useEffect } from 'react';
import { History, Trash2, Calendar, ShieldAlert, CheckCircle, Download, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { AnalysisSession, Riesgo } from '../types';
import { useToast } from '../components/ToastProvider';

interface HistorialRiesgosProps {
  history: AnalysisSession[];
  initialSessionId?: string;
  onDeleteSession: (id: string) => void;
  onSaveRiesgo: (riesgo: Riesgo) => void;
  savedRiesgosIds: string[];
  savedRiesgos: Riesgo[];
  onBack?: () => void;
}

export default function HistorialRiesgos({
  history,
  initialSessionId,
  onDeleteSession,
  onSaveRiesgo,
  savedRiesgosIds,
  savedRiesgos,
  onBack,
}: HistorialRiesgosProps) {
  const { showToast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Auto-select session on load or initialSessionId change
  useEffect(() => {
    if (initialSessionId) {
      setSelectedSessionId(initialSessionId);
    } else if (history.length > 0 && !selectedSessionId) {
      setSelectedSessionId(history[0].id);
    }
  }, [initialSessionId, history, selectedSessionId]);

  const selectedSession = history.find(s => s.id === selectedSessionId) || history[0];

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  const handleDeleteSessionClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Está seguro de que desea eliminar este análisis del historial? Esta acción es irreversible.')) {
      onDeleteSession(id);
      if (selectedSessionId === id) {
        setSelectedSessionId(null);
      }
      showToast('Análisis eliminado del historial.', 'info');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Title & Back Button */}
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-indigo-600" />
            Historial de Análisis
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Revise los resultados de las auditorías legales y de bases realizadas con anterioridad.
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        /* NO HISTORY VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-md mx-auto">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Historial Vacío</h3>
          <p className="text-sm text-slate-500 mt-2">
            No se han registrado auditorías de riesgos en el sistema. Vaya al módulo "Identificar Riesgos" para realizar su primer análisis de licitación.
          </p>
        </div>
      ) : (
        /* SIDE-BY-SIDE GRID */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: list of sessions */}
          <div className="lg:col-span-4 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 pb-1">
              Sesiones de Auditoría ({history.length})
            </div>
            {history.map((session) => {
              const isSelected = selectedSessionId === session.id;
              const sessionProj = session.formData?.nombreProyecto || session.result?.proyecto || 'Proyecto de Licitación';
              const sessionSector = session.result?.sector || session.formData?.sector || '';
              const sessionRiesgosCount = session.result?.resultado?.riesgos_detectados?.length || 0;

              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative group flex flex-col gap-2.5 ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-sm tracking-wide line-clamp-1 flex-1">
                      {sessionProj}
                    </span>
                    <button
                      onClick={(e) => handleDeleteSessionClick(e, session.id)}
                      className={`p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0 ${
                        isSelected 
                          ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' 
                          : 'text-slate-400 hover:text-rose-600 hover:bg-slate-150'
                      }`}
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(session.fecha)}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100/10 pt-2.5 mt-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase ${isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        {sessionSector}
                      </span>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      sessionRiesgosCount > 0
                        ? (isSelected ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-800')
                        : (isSelected ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400')
                    }`}>
                      {sessionRiesgosCount} {sessionRiesgosCount === 1 ? 'riesgo' : 'riesgos'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right panel: active session details */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
            {selectedSession ? (
              <div className="divide-y divide-slate-100">
                {/* Header card info */}
                <div className="p-6 sm:p-8 space-y-4 bg-slate-50/50">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <span className="text-xs font-mono font-bold text-slate-400">ID: {selectedSession.id}</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500 font-semibold">{formatDate(selectedSession.fecha)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                      {selectedSession.formData?.nombreProyecto || selectedSession.result?.proyecto || 'Proyecto de Licitación'}
                    </h2>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                        Sector: {selectedSession.result?.sector || selectedSession.formData?.sector || ''}
                      </span>
                      <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                        Contrato: {typeof selectedSession.result?.proyecto === 'string' ? selectedSession.result?.proyecto : selectedSession.formData?.tipoContrato?.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    {/* Excel download */}
                    {selectedSession.result?.url_descarga_excel && (
                      <a
                        href={selectedSession.result.url_descarga_excel}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        DESCARGAR EXCEL
                      </a>
                    )}
                    {/* PDF download */}
                    {selectedSession.result?.url_descarga_pdf && (
                      <a
                        href={selectedSession.result.url_descarga_pdf}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        DESCARGAR INFORME PDF
                      </a>
                    )}
                  </div>
                </div>

                {/* Executive summary */}
                {selectedSession.result?.resultado?.resumen_ejecutivo && (
                  <div className="p-6 sm:p-8 space-y-3 bg-indigo-50/20 border-y border-slate-100">
                    <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-indigo-500" />
                      Diagnóstico y Resumen Ejecutivo
                    </h3>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium">
                      {selectedSession.result.resultado.resumen_ejecutivo}
                    </p>
                  </div>
                )}

                {/* Risks list */}
                <div className="p-6 sm:p-8 space-y-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                    Riesgos y Contingencias Detectadas ({selectedSession.result?.resultado?.riesgos_detectados?.length || 0})
                  </h3>

                  {!selectedSession.result?.resultado?.riesgos_detectados || selectedSession.result.resultado.riesgos_detectados.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                      <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No se encontraron riesgos críticos en el documento analizado.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedSession.result.resultado.riesgos_detectados.map((riesgo, index) => {
                        const alreadySaved = savedRiesgosIds.includes(riesgo.riesgo_identificado) || 
                          savedRiesgos.some(r => r.riesgo_identificado === riesgo.riesgo_identificado);
                        
                        return (
                          <div key={index} className="p-5 rounded-2xl border border-slate-150 space-y-4 hover:border-slate-300 transition-colors">
                            {/* Metadata labels row */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                  {riesgo.categoria || 'LEGAL'}
                                </span>
                                {riesgo.subcategoria && (
                                  <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">
                                    {riesgo.subcategoria}
                                  </span>
                                )}
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  riesgo.nivel_sustento_documental === 'ALTO' ? 'bg-emerald-100 text-emerald-800' :
                                  riesgo.nivel_sustento_documental === 'MEDIO' ? 'bg-amber-100 text-amber-800' :
                                  riesgo.nivel_sustento_documental === 'BAJO' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                                }`}>
                                  Sustento: {riesgo.nivel_sustento_documental || 'MEDIO'}
                                </span>
                              </div>

                              {/* Save or Saved status button */}
                              {alreadySaved ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Guardado en Biblioteca
                                </span>
                              ) : (
                                <button
                                  onClick={() => onSaveRiesgo(riesgo)}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-white bg-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 px-3 py-1 rounded-full transition-all cursor-pointer shadow-xs"
                                >
                                  Guardar en Biblioteca
                                </button>
                              )}
                            </div>

                            {/* Main text content */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                              <div className="md:col-span-7 space-y-1.5">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Riesgo Identificado</h4>
                                <p className="text-slate-800 font-bold text-sm leading-relaxed">
                                  {riesgo.riesgo_identificado}
                                </p>
                              </div>
                              <div className="md:col-span-5 bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sustento Legal y Contexto</h4>
                                <p className="leading-relaxed whitespace-pre-line font-medium">
                                  {riesgo.sustento_legal_normativo || 'Verificado de acuerdo a términos generales del pliego de condiciones de la licitación.'}
                                </p>
                              </div>
                            </div>

                            {/* Source location */}
                            {(riesgo.seccion_bases || riesgo.pagina_pdf) && (
                              <div className="text-[10px] font-semibold text-slate-400 border-t border-slate-100 pt-2.5 flex items-center gap-4">
                                {riesgo.seccion_bases && (
                                  <span><strong>Ubicación:</strong> {riesgo.seccion_bases}</span>
                                )}
                                {riesgo.pagina_pdf && (
                                  <span><strong>Página:</strong> {riesgo.pagina_pdf}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                Seleccione un análisis de la lista izquierda para visualizar.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
