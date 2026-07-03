import { useState, useEffect, useMemo } from "react";
import {
  History,
  Trash2,
  Calendar,
  ShieldAlert,
  CheckCircle,
  Download,
  FileSpreadsheet,
  ArrowLeft,
  Search, Filter,
  X, Database, Pencil, ChevronDown, Edit,
} from "lucide-react";
import { AnalysisSession, Riesgo } from "@/types";
import { useToast } from "@/components/ToastProvider";
import { handleDownloadExcel } from "./utils/exportUtils";
import { RiskCard } from "./components/RiskCard";

import { AnalysisHistoryService } from "@/lib/api";

interface HistorialRiesgosProps {
  history: AnalysisSession[];
  initialSessionId?: string;
  onDeleteSession: (id: string) => void;
  onUpdateSession: (session: AnalysisSession) => void;
  onSaveRiesgo: (riesgo: Riesgo) => void;
  savedRiesgos: Riesgo[];
}

export default function HistorialRiesgos({
  history,
  initialSessionId,
  onDeleteSession,
  onUpdateSession,
  onSaveRiesgo,
  savedRiesgos,
}: HistorialRiesgosProps) {
  const { showToast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [isBulkEditDropdownOpen, setIsBulkEditDropdownOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<keyof Riesgo | "">("");
  const [bulkEditValue, setBulkEditValue] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [selectedTipoContrato, setSelectedTipoContrato] = useState("ALL");
    const [selectedDate, setSelectedDate] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const [editingRiskIndex, setEditingRiskIndex] = useState<number | null>(null);
  const [editedRiskData, setEditedRiskData] = useState<Partial<Riesgo>>({});
  const [expandedRiskIndices, setExpandedRiskIndices] = useState<Set<number>>(
    new Set(),
  );

  // Reset editing state on session change
  useEffect(() => {
    setEditingRiskIndex(null);
    setEditedRiskData({});
    setExpandedRiskIndices(new Set());
  }, [selectedSessionId]);

  // Auto-select session on load if initialSessionId change
  useEffect(() => {
    if (initialSessionId) {
      setSelectedSessionId(initialSessionId);
    }
  }, [initialSessionId]);

  const sectores = useMemo(() => {
    return [
      "ALL",
      ...Array.from(
        new Set(
          history
            .flatMap((s) => s.formData?.sector || (s.result?.sector ? [s.result.sector] : []))
            .filter(Boolean),
        ),
      ),
    ];
  }, [history]);

  const tiposContrato = useMemo(() => {
    const types = history.map((s) => s.formData?.tipoContrato).filter(Boolean);
    return ["ALL", ...Array.from(new Set(types))].sort();
  }, [history]);

  const categorias = useMemo(() => {
    let filtered = history;
    if (selectedSector !== "ALL") {
      filtered = filtered.filter(
        (s) => {
          const sSector = s.formData?.sector || (s.result?.sector ? [s.result.sector] : []);
          return sSector.includes(selectedSector);
        },
      );
    }
    if (selectedTipoContrato !== "ALL") {
      filtered = filtered.filter((s) =>
        s.formData?.tipoContrato === selectedTipoContrato,
      );
    }
    const cats = filtered.flatMap((s) =>
      s.formData?.categoria?.length
        ? s.formData.categoria
        : s.result?.categoria
          ? [s.result.categoria]
          : [],
    );
    return ["ALL", ...Array.from(new Set(cats)).filter(Boolean)];
  }, [history, selectedSector, selectedTipoContrato]);

  
  
  const filteredHistory = useMemo(() => {
    return history.filter((session) => {
      const sessionProj =
        session.formData?.nombreProyecto ||
        session.result?.proyecto ||
        "Proyecto de Licitación";
      const sessionSectorArr = session.formData?.sector || (session.result?.sector ? [session.result.sector] : []);
      const sessionTipos = session.formData?.tipoContrato || "";
      const sessionCats = session.formData?.categoria?.length
        ? session.formData.categoria
        : session.result?.categoria
          ? [session.result.categoria]
          : [];

      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        sessionProj.toLowerCase().includes(lowerSearch) ||
        sessionSectorArr.some(s => s.toLowerCase().includes(lowerSearch)) ||
        (session.filename &&
          session.filename.toLowerCase().includes(lowerSearch));

      const matchesSector =
        selectedSector === "ALL" || sessionSectorArr.includes(selectedSector);
      const matchesTipoContrato =
        selectedTipoContrato === "ALL" ||
        sessionTipos === selectedTipoContrato;

      let matchesDate = true;
      if (selectedDate !== "ALL") {
        const sessionDate = new Date(session.fecha);
        const today = new Date();
        if (selectedDate === "7_DAYS") {
          const sevenDaysAgo = new Date(
            today.getTime() - 7 * 24 * 60 * 60 * 1000,
          );
          matchesDate = sessionDate >= sevenDaysAgo;
        } else if (selectedDate === "30_DAYS") {
          const thirtyDaysAgo = new Date(
            today.getTime() - 30 * 24 * 60 * 60 * 1000,
          );
          matchesDate = sessionDate >= thirtyDaysAgo;
        } else if (selectedDate === "THIS_MONTH") {
          matchesDate =
            sessionDate.getMonth() === today.getMonth() &&
            sessionDate.getFullYear() === today.getFullYear();
        } else if (selectedDate === "THIS_YEAR") {
          matchesDate = sessionDate.getFullYear() === today.getFullYear();
        }
      }

      return (
        matchesSearch &&
        matchesSector &&
        matchesTipoContrato &&
        matchesDate
      );
    });
  }, [
    history,
    searchTerm,
    selectedSector,
    selectedTipoContrato,
    selectedDate,
  ]);

  const selectedSession = selectedSessionId
    ? history.find((s) => s.id === selectedSessionId)
    : null;

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return isoString;
      }
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return isoString;
    }
  };

  const handleDeleteSessionClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteSession(id);
  };

  useEffect(() => {
    if (selectedSessionId && !history.find((s) => s.id === selectedSessionId)) {
      setSelectedSessionId(null);
    }
  }, [history, selectedSessionId]);

  useEffect(() => {
    const loadSessionDetails = async () => {
      if (
        selectedSession &&
        !selectedSession.isFullyLoaded &&
        !loadingDetails
      ) {
        setLoadingDetails(true);
        try {
          const details = await AnalysisHistoryService.getById(
            selectedSession.id,
          );
          onUpdateSession(details);
        } catch (error: any) {
          console.error("Failed to load session details", error);
          if (selectedSession.result?.resultado?.riesgos_detectados?.length) {
            onUpdateSession({ ...selectedSession, isFullyLoaded: true });
          } else {
            showToast("Error al cargar los detalles del análisis", "error");
          }
        } finally {
          setLoadingDetails(false);
        }
      }
    };
    loadSessionDetails();
  }, [selectedSession, loadingDetails, onUpdateSession, showToast]);

  const toggleExpandRisk = (index: number) => {
    setExpandedRiskIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleStartEdit = (riesgo: Riesgo, index: number) => {
    setEditingRiskIndex(index);
    setEditedRiskData({ ...riesgo });
  };

  const handleSaveRiskChanges = (index: number) => {
    if (
      !selectedSession ||
      !selectedSession.result?.resultado?.riesgos_detectados
    )
      return;

    const updatedRiesgos = [
      ...selectedSession.result.resultado.riesgos_detectados,
    ];
    updatedRiesgos[index] = {
      ...updatedRiesgos[index],
      ...editedRiskData,
    };

    const updatedSession = {
      ...selectedSession,
      result: {
        ...selectedSession.result,
        resultado: {
          ...selectedSession.result.resultado,
          riesgos_detectados: updatedRiesgos,
        },
      },
    };

    onUpdateSession(updatedSession);
    setEditingRiskIndex(null);
    setEditedRiskData({});
    showToast("Cambios guardados en la sesión de análisis.", "success");
  };

  
  const EDITABLE_FIELDS: { key: keyof Riesgo, label: string }[] = [
    { key: 'tipo_contrato', label: 'Tipo Contrato' },
    { key: 'sector', label: 'Sector' },
    { key: 'categoria', label: 'Categoría' },
    { key: 'subcategoria', label: 'Subcategoría' },
    { key: 'riesgo_identificado', label: 'Riesgo Identificado' },
    { key: 'foco_revision', label: 'Foco Revisión' },
    { key: 'nombre_archivo_licitacion', label: 'Archivo Licitación' },
    { key: 'seccion_evidencia_licitacion', label: 'Evidencia Licitación' },
    { key: 'pagina_pdf_licitacion', label: 'Página PDF' },
    { key: 'fragmento_licitacion_evidencia', label: 'Fragmento Evidencia' },
    { key: 'nombre_archivo_normativa', label: 'Archivo Normativa' },
    { key: 'evidencia_seccion_normativa_riesgo', label: 'Evidencia Sección Normativa' },
    { key: 'nivel_sustento_documental', label: 'Nivel Sustento' }
  ];

  const toggleSelectAll = () => {
    if (selectedSession?.result?.resultado?.riesgos_detectados) {
      if (selectedRowIndices.size === selectedSession.result.resultado.riesgos_detectados.length) {
        setSelectedRowIndices(new Set());
      } else {
        setSelectedRowIndices(new Set(selectedSession.result.resultado.riesgos_detectados.map((_, i) => i)));
      }
    }
  };

  const toggleSelectRow = (index: number) => {
    const newSet = new Set(selectedRowIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedRowIndices(newSet);
  };

  const openBulkEdit = (field: keyof Riesgo) => {
    setBulkEditField(field);
    setBulkEditValue("");
    setIsBulkEditDropdownOpen(false);
    setIsBulkEditModalOpen(true);
  };

  const handleApplyBulkEdit = () => {
    if (!selectedSession || !selectedSession.result?.resultado?.riesgos_detectados || !bulkEditField) return;

    const updatedRiesgos = [...selectedSession.result.resultado.riesgos_detectados];
    selectedRowIndices.forEach(idx => {
      updatedRiesgos[idx] = {
        ...updatedRiesgos[idx],
        [bulkEditField]: bulkEditValue
      };
    });

    const updatedSession = {
      ...selectedSession,
      result: {
        ...selectedSession.result,
        resultado: {
          ...selectedSession.result.resultado,
          riesgos_detectados: updatedRiesgos,
        },
      },
    };

    onUpdateSession(updatedSession);
    setIsBulkEditModalOpen(false);
    setBulkEditField("");
    setBulkEditValue("");
    setSelectedRowIndices(new Set());
    showToast("Campos actualizados correctamente.", "success");
  };

  const allSelected = selectedSession?.result?.resultado?.riesgos_detectados?.length 
    ? selectedRowIndices.size === selectedSession.result.resultado.riesgos_detectados.length 
    : false;

  const handleSaveToBC = (riesgo: Riesgo, index?: number) => {
    let finalRiesgo = riesgo;
    if (index !== undefined && editingRiskIndex === index) {
      finalRiesgo = {
        ...riesgo,
        ...editedRiskData,
      };

      if (
        selectedSession &&
        selectedSession.result?.resultado?.riesgos_detectados
      ) {
        const updatedRiesgos = [
          ...selectedSession.result.resultado.riesgos_detectados,
        ];
        updatedRiesgos[index] = finalRiesgo;

        const updatedSession = {
          ...selectedSession,
          result: {
            ...selectedSession.result,
            resultado: {
              ...selectedSession.result.resultado,
              riesgos_detectados: updatedRiesgos,
            },
          },
        };
        onUpdateSession(updatedSession);
      }

      setEditingRiskIndex(null);
      setEditedRiskData({});
    }

    onSaveRiesgo({
      ...finalRiesgo,
      id_analisis: selectedSession?.id,
    });
  };

  
  
  if (selectedSessionId && selectedSession) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => setSelectedSessionId(null)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Volver al Historial"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-indigo-600" />
              Detalle del Análisis
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Revisión de los riesgos identificados para el proyecto {selectedSession.formData?.nombreProyecto || selectedSession.result?.proyecto}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex-1 divide-y divide-slate-100">
            <div className="p-6 sm:p-8 space-y-4 bg-slate-50/50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-xs font-mono font-bold text-slate-400">
                  ID: {selectedSession.id}
                </span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500 font-semibold">
                    {formatDate(selectedSession.fecha)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                  {selectedSession.formData?.nombreProyecto || selectedSession.result?.proyecto || "Proyecto de Licitación"}
                </h2>
              </div>
            </div>

            {selectedSession.formData?.promptContexto && (
              <div className="p-6 sm:p-8 space-y-3 bg-slate-50 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  Contexto Adicional Proporcionado
                </h3>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                  {selectedSession.formData.promptContexto}
                </p>
              </div>
            )}

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
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Riesgos y Contingencias Detectadas ({selectedSession.result?.resultado?.riesgos_detectados?.length || 0})
            </h3>
            
            {selectedSession.result?.resultado?.riesgos_detectados && selectedSession.result.resultado.riesgos_detectados.length > 0 && (
              <div className="flex items-center gap-3 relative">
                <button
                  onClick={() => setIsBulkEditDropdownOpen(!isBulkEditDropdownOpen)}
                  disabled={selectedRowIndices.size === 0}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer ${
                    selectedRowIndices.size > 0 
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Edit className="w-4 h-4" />
                  EDITAR SELECCIONADOS ({selectedRowIndices.size})
                  <ChevronDown className="w-4 h-4" />
                </button>
                {isBulkEditDropdownOpen && (
                  <div className="absolute top-full right-[150px] mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3 pt-2">Seleccionar Campo</h4>
                      {EDITABLE_FIELDS.map((field) => (
                        <button
                          key={field.key}
                          onClick={() => openBulkEdit(field.key)}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
                        >
                          {field.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleDownloadExcel(selectedSession)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  DESCARGAR EXCEL
                </button>
              </div>
            )}
          </div>

          {loadingDetails ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-4">
              <div className="w-8 h-8 mx-auto border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500 font-medium">Cargando detalles de los riesgos...</p>
            </div>
          ) : !selectedSession.result?.resultado?.riesgos_detectados || selectedSession.result.resultado.riesgos_detectados.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No se encontraron riesgos críticos en el documento analizado.</p>
            </div>
          ) : (
            <div className="min-w-full border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto overflow-y-auto max-h-[60vh] w-full">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-xs sticky top-0 z-10">
                    <tr>
                      <th className="p-3 sticky left-0 bg-slate-100 z-20">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-600 cursor-pointer"
                        />
                      </th>
                      <th className="p-3">ID Riesgo</th>
                      <th className="p-3">Tipo Contrato</th>
                      <th className="p-3">Sector</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3">Subcategoría</th>
                      <th className="p-3 min-w-[300px]">Riesgo Identificado</th>
                      <th className="p-3 min-w-[300px]">Foco Revisión</th>
                      <th className="p-3">Archivo Licitación</th>
                      <th className="p-3 min-w-[200px]">Evidencia Licitación</th>
                      <th className="p-3">Página PDF</th>
                      <th className="p-3 min-w-[300px]">Fragmento Evidencia</th>
                      <th className="p-3">Archivo Normativa</th>
                      <th className="p-3 min-w-[300px]">Evidencia Sección Normativa</th>
                      <th className="p-3">Nivel Sustento</th>
                      <th className="p-3 sticky right-0 bg-slate-100 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSession.result.resultado.riesgos_detectados.map((r, idx) => {
                      const alreadySaved = savedRiesgos.some(
                        (sr) =>
                          sr.riesgo_identificado === r.riesgo_identificado &&
                          sr.id_analisis === selectedSession.id
                      );
                      const sectorVal = Array.isArray(selectedSession.formData?.sector) ? selectedSession.formData.sector.join(", ") : selectedSession.formData?.sector;
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 hover:bg-slate-100'}>
                          <td className="p-3 sticky left-0 z-10" style={{ backgroundColor: 'inherit' }}>
                            <input
                              type="checkbox"
                              checked={selectedRowIndices.has(idx)}
                              onChange={() => toggleSelectRow(idx)}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono text-slate-500">{r.riesgo_id || r.numero_riesgo || String(idx + 1).padStart(3, "0")}</td>
                          <td className="p-3">{r.tipo_contrato || selectedSession.formData?.tipoContrato || ""}</td>
                          <td className="p-3">{r.sector || sectorVal || ""}</td>
                          <td className="p-3">{r.categoria || ""}</td>
                          <td className="p-3">{r.subcategoria || ""}</td>
                          <td className="p-3 font-semibold text-slate-800 whitespace-normal break-words min-w-[300px]">{r.riesgo_identificado || ""}</td>
                          <td className="p-3 whitespace-normal break-words min-w-[300px]">{r.foco_revision || ""}</td>
                          <td className="p-3">{r.nombre_archivo_licitacion || ""}</td>
                          <td className="p-3 whitespace-normal break-words min-w-[200px]">{r.seccion_evidencia_licitacion || r.evidencia_licitacion || ""}</td>
                          <td className="p-3">{r.pagina_pdf_licitacion || r.pagina_pdf || ""}</td>
                          <td className="p-3 italic text-slate-500 whitespace-normal break-words min-w-[300px]">{r.fragmento_licitacion_evidencia || r.fragmento_literal_fuente || ""}</td>
                          <td className="p-3">{r.nombre_archivo_normativa || ""}</td>
                          <td className="p-3 whitespace-normal break-words min-w-[300px]">{r.evidencia_seccion_normativa_riesgo || r.sustento_legal_normativo || ""}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              r.nivel_sustento_documental?.toUpperCase() === "ALTO" ? "bg-emerald-100 text-emerald-700" :
                              r.nivel_sustento_documental?.toUpperCase() === "MEDIO" ? "bg-amber-100 text-amber-700" :
                              "bg-slate-100 text-slate-700"
                            }`}>
                              {r.nivel_sustento_documental || "N/A"}
                            </span>
                          </td>
                          <td className="p-3 sticky right-0 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)]" style={{ backgroundColor: 'inherit' }}>
                            <button
                              onClick={() => handleSaveToBC(r)}
                              disabled={alreadySaved}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2 w-max ${
                                alreadySaved
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                              }`}
                            >
                              <Database className="w-4 h-4" />
                              {alreadySaved ? "En Base" : "Guardar en BC"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isBulkEditModalOpen && (
            <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Editar Selección Multiple</h3>
                  <button
                    onClick={() => setIsBulkEditModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Campo a modificar:
                    </label>
                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium">
                      {EDITABLE_FIELDS.find(f => f.key === bulkEditField)?.label}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Nuevo Valor:
                    </label>
                    <textarea
                      value={bulkEditValue}
                      onChange={(e) => setBulkEditValue(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[120px]"
                      placeholder="Ingrese el nuevo valor que se aplicará a todos los riesgos seleccionados..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-8">
                  <button
                    onClick={() => setIsBulkEditModalOpen(false)}
                    className="px-6 py-2.5 text-slate-700 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleApplyBulkEdit}
                    disabled={!bulkEditValue.trim()}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aplicar Cambios
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

    const activeFiltersCount = [
    selectedSector !== "ALL",
    selectedTipoContrato !== "ALL",
    selectedDate !== "ALL"
  ].filter(Boolean).length;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-4">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-md mx-auto">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Historial Vacío</h3>
          <p className="text-sm text-slate-500 mt-2">
            No se han registrado auditorías de riesgos en el sistema.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar proyecto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${activeFiltersCount > 0 || showFilters ? "bg-indigo-100 text-indigo-700 border-transparent" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                <Filter className="w-4 h-4" />
                Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </button>
            </div>
            
            {showFilters && (
              <div className="flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                <div className={`relative flex items-center px-3 py-1.5 rounded-full transition-colors border ${selectedDate !== "ALL" ? "bg-indigo-100 text-indigo-700 border-transparent" : "bg-transparent border-transparent hover:bg-slate-100 text-slate-600"}`}>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="appearance-none bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm font-medium cursor-pointer pr-6"
                  >
                    <option value="ALL">Todas las Fechas</option>
                    <option value="7_DAYS">Últimos 7 días</option>
                    <option value="30_DAYS">Últimos 30 días</option>
                    <option value="THIS_MONTH">Este mes</option>
                    <option value="THIS_YEAR">Este año</option>
                  </select>
                  {selectedDate !== "ALL" ? (
                    <button onClick={() => setSelectedDate("ALL")} className="absolute right-2 p-0.5 rounded-full hover:bg-indigo-200 text-indigo-500 hover:text-indigo-700 z-10" title="Quitar filtro">
                      <X className="w-3 h-3" />
                    </button>
                  ) : (
                    <ChevronDown className="absolute right-2 w-3 h-3 pointer-events-none opacity-50" />
                  )}
                </div>

                <div className={`relative flex items-center px-3 py-1.5 rounded-full transition-colors border ${selectedTipoContrato !== "ALL" ? "bg-indigo-100 text-indigo-700 border-transparent" : "bg-transparent border-transparent hover:bg-slate-100 text-slate-600"}`}>
                  <select
                    value={selectedTipoContrato}
                    onChange={(e) => setSelectedTipoContrato(e.target.value)}
                    className="appearance-none bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm font-medium cursor-pointer pr-6"
                  >
                    {tiposContrato.map((t) => (
                      <option key={t} value={t}>
                        {t === "ALL" ? "Tipos de Contrato" : t}
                      </option>
                    ))}
                  </select>
                  {selectedTipoContrato !== "ALL" ? (
                    <button onClick={() => setSelectedTipoContrato("ALL")} className="absolute right-2 p-0.5 rounded-full hover:bg-indigo-200 text-indigo-500 hover:text-indigo-700 z-10" title="Quitar filtro">
                      <X className="w-3 h-3" />
                    </button>
                  ) : (
                    <ChevronDown className="absolute right-2 w-3 h-3 pointer-events-none opacity-50" />
                  )}
                </div>

                <div className={`relative flex items-center px-3 py-1.5 rounded-full transition-colors border ${selectedSector !== "ALL" ? "bg-indigo-100 text-indigo-700 border-transparent" : "bg-transparent border-transparent hover:bg-slate-100 text-slate-600"}`}>
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="appearance-none bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm font-medium cursor-pointer pr-6"
                  >
                    {sectores.map((s) => (
                      <option key={s} value={s}>
                        {s === "ALL" ? "Todos los Sectores" : s}
                      </option>
                    ))}
                  </select>
                  {selectedSector !== "ALL" ? (
                    <button onClick={() => setSelectedSector("ALL")} className="absolute right-2 p-0.5 rounded-full hover:bg-indigo-200 text-indigo-500 hover:text-indigo-700 z-10" title="Quitar filtro">
                      <X className="w-3 h-3" />
                    </button>
                  ) : (
                    <ChevronDown className="absolute right-2 w-3 h-3 pointer-events-none opacity-50" />
                  )}
                </div>
                
                {(searchTerm !== "" || activeFiltersCount > 0) && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedSector("ALL");
                      setSelectedTipoContrato("ALL");
                      setSelectedDate("ALL");
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors ml-auto"
                    title="Limpiar todos los filtros"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="w-full overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-xs">
                <tr>
                  <th className="p-3">ID Análisis</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3 min-w-[200px]">Proyecto</th>
                  <th className="p-3">Tipo Contrato</th>
                  <th className="p-3">Sector</th>
                  <th className="p-3 min-w-[200px]">Mensaje</th>
                  <th className="p-3 text-center">Total Riesgos</th>
                  <th className="p-3 text-center">Tiempo (s)</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No se encontraron resultados para los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((session, idx) => {
                    const sessionProj = session.formData?.nombreProyecto || session.result?.proyecto || session.filename || "S/N";
                    const sessionSectorArr = session.formData?.sector || (session.result?.sector ? [session.result.sector] : []);
                    const sessionSectorStr = sessionSectorArr.length ? sessionSectorArr.join(", ") : "S/N";
                    const sessionTipo = session.formData?.tipoContrato || "S/N";
                    
                    const totalRiesgos = session.total_riesgos || (session.result?.resultado?.riesgos_detectados?.length) || 0;
                    const mensaje = session.mensaje || "Análisis completado";
                    const tiempo = session.tiempo_identificacion_riesgo || "-";
                    
                    return (
                      <tr key={session.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50 transition-colors cursor-pointer' : 'bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer'} onClick={() => setSelectedSessionId(session.id)}>
                        <td className="p-3 font-mono text-slate-500">{session.id.substring(0, 8)}</td>
                        <td className="p-3 text-slate-600">{formatDate(session.fecha)}</td>
                        <td className="p-3 font-semibold text-slate-800 whitespace-normal break-words min-w-[200px]">{sessionProj}</td>
                        <td className="p-3"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-wider">{sessionTipo}</span></td>
                        <td className="p-3"><span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">{sessionSectorStr}</span></td>
                        <td className="p-3 text-slate-500 text-xs whitespace-normal break-words min-w-[200px]">{mensaje}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${totalRiesgos > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{totalRiesgos}</span>
                        </td>
                        <td className="p-3 text-slate-500 text-center font-mono">{tiempo}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSessionClick(e, session.id); }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Eliminar historial"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}