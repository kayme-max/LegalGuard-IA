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
  Search,
  X,
} from "lucide-react";
import { AnalysisSession, Riesgo } from "@/types";
import { useToast } from "@/components/ToastProvider";
import { handleDownloadExcel, handleDownloadPDF } from "./utils/exportUtils";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [selectedTipoContrato, setSelectedTipoContrato] = useState("ALL");
  const [selectedCategoria, setSelectedCategoria] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("ALL");
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
    let filtered = history;
    if (selectedSector !== "ALL") {
      filtered = filtered.filter(
        (s) => {
          const sSector = s.formData?.sector || (s.result?.sector ? [s.result.sector] : []);
          return sSector.includes(selectedSector);
        },
      );
    }
    const types = filtered.map((s) => s.formData?.tipoContrato).filter(Boolean);
    return ["ALL", ...Array.from(new Set(types))];
  }, [history, selectedSector]);

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

  useEffect(() => {
    if (selectedSector !== "ALL") {
      setSelectedTipoContrato("ALL");
      setSelectedCategoria("ALL");
    }
  }, [selectedSector]);

  useEffect(() => {
    if (selectedTipoContrato !== "ALL") {
      setSelectedCategoria("ALL");
    }
  }, [selectedTipoContrato]);

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
      const matchesCategoria =
        selectedCategoria === "ALL" || sessionCats.includes(selectedCategoria);

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
        matchesCategoria &&
        matchesDate
      );
    });
  }, [
    history,
    searchTerm,
    selectedSector,
    selectedTipoContrato,
    selectedCategoria,
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Title & Back Button */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-indigo-600" />
            Historial de Análisis
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Revise los resultados de las auditorías legales y de bases
            realizadas con anterioridad.
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        /* NO HISTORY VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-md mx-auto">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Historial Vacío</h3>
          <p className="text-sm text-slate-500 mt-2">
            No se han registrado auditorías de riesgos en el sistema. Vaya al
            módulo "Identificar Riesgos" para realizar su primer análisis de
            licitación.
          </p>
        </div>
      ) : !selectedSessionId ? (
        <div className="flex flex-col gap-6">
          {/* Filters Block */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="relative w-full md:w-1/4">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar documento o proyecto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all focus:bg-white"
                />
              </div>
              <div className="w-full md:w-3/4 flex flex-wrap items-center gap-3">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-600 font-medium"
                >
                  <option value="ALL">Todas las Fechas</option>
                  <option value="7_DAYS">Últimos 7 días</option>
                  <option value="30_DAYS">Últimos 30 días</option>
                  <option value="THIS_MONTH">Este mes</option>
                  <option value="THIS_YEAR">Este año</option>
                </select>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-600 font-medium"
                >
                  <option value="ALL">Todos los Sectores</option>
                  {sectores
                    .filter((s) => s !== "ALL")
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </select>
                <select
                  value={selectedTipoContrato}
                  onChange={(e) => setSelectedTipoContrato(e.target.value)}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-600 font-medium"
                >
                  <option value="ALL">Tipos de Contrato</option>
                  {tiposContrato
                    .filter((t) => t !== "ALL")
                    .map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                </select>
                <select
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-600 font-medium"
                >
                  <option value="ALL">Todas las Categorías</option>
                  {categorias
                    .filter((c) => c !== "ALL")
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>

                {(searchTerm ||
                  selectedSector !== "ALL" ||
                  selectedTipoContrato !== "ALL" ||
                  selectedCategoria !== "ALL" ||
                  selectedDate !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedDate("ALL");
                      setSelectedSector("ALL");
                      setSelectedTipoContrato("ALL");
                      setSelectedCategoria("ALL");
                    }}
                    className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl border border-rose-100 transition-colors cursor-pointer shrink-0"
                    title="Limpiar Filtros"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="text-sm text-slate-500 font-medium px-2">
                {filteredHistory.length}{" "}
                {filteredHistory.length === 1 ? "resultado" : "resultados"}
              </div>
            </div>
          </div>

          {/* List of sessions (Rows) */}
          <div className="space-y-4">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm bg-white rounded-2xl border border-slate-200 shadow-sm">
                No se encontraron resultados para "{searchTerm}"
              </div>
            ) : (
              filteredHistory.map((session) => {
                const sessionProj =
                  session.formData?.nombreProyecto ||
                  session.result?.proyecto ||
                  "Proyecto de Licitación";
                const sessionSectorStr = (session.formData?.sector || (session.result?.sector ? [session.result.sector] : [])).join(", ") || "S/N";
                const sessionRiesgosCount =
                  session.total_riesgos ??
                  session.result?.resultado?.riesgos_detectados?.length ??
                  0;
                const sessionTipo =
                  session.formData?.tipoContrato || "S/N";
                const sessionCats = session.formData?.categoria?.length
                  ? session.formData.categoria.join(", ")
                  : session.result?.categoria || "S/N";

                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 text-lg line-clamp-1">
                          {sessionProj}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                            {sessionSectorStr}
                          </span>
                          {sessionTipo !== "S/N" && (
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                              {sessionTipo}
                            </span>
                          )}
                          {sessionCats !== "S/N" && (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                              {sessionCats}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(session.fecha)}</span>
                        </div>
                        {session.filename && (
                          <div
                            className="flex items-center gap-1.5 line-clamp-1"
                            title={session.filename}
                          >
                            <span>Doc: {session.filename}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Riesgos
                        </span>
                        <span
                          className={`px-3 py-1 text-sm font-bold rounded-full ${
                            sessionRiesgosCount > 0
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {sessionRiesgosCount} detectados
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSessionClick(e, session.id)}
                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        selectedSession && (
          /* DETAIL VIEW */
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col animate-in fade-in duration-300">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-white rounded-t-3xl">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                Detalle del Análisis
              </h2>
              <button
                onClick={() => setSelectedSessionId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-bold">Volver al historial</span>
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1">
              <div className="divide-y divide-slate-100">
                {/* Header card info */}
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
                      {selectedSession.formData?.nombreProyecto ||
                        selectedSession.result?.proyecto ||
                        "Proyecto de Licitación"}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    {/* Excel download */}
                    {selectedSession.result?.resultado?.riesgos_detectados &&
                      selectedSession.result.resultado.riesgos_detectados
                        .length > 0 && (
                        <button
                          onClick={() => handleDownloadExcel(selectedSession)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          DESCARGAR EXCEL
                        </button>
                      )}
                    {/* PDF download */}
                    {selectedSession.result?.resultado?.riesgos_detectados &&
                      selectedSession.result.resultado.riesgos_detectados
                        .length > 0 && (
                        <button
                          onClick={() => handleDownloadPDF(selectedSession)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          DESCARGAR INFORME PDF
                        </button>
                      )}
                  </div>
                </div>

                {/* User Prompt / Context */}
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
                <div className="p-6 sm:p-8 space-y-6 pb-24">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                    Riesgos y Contingencias Detectadas (
                    {selectedSession.result?.resultado?.riesgos_detectados
                      ?.length || 0}
                    )
                  </h3>

                  {loadingDetails ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-4">
                      <div className="w-8 h-8 mx-auto border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm text-slate-500 font-medium">
                        Cargando detalles de los riesgos...
                      </p>
                    </div>
                  ) : !selectedSession.result?.resultado?.riesgos_detectados ||
                    selectedSession.result.resultado.riesgos_detectados
                      .length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                      <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">
                        No se encontraron riesgos críticos en el documento
                        analizado.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedSession.result.resultado.riesgos_detectados.map(
                        (riesgo, index) => {
                          const alreadySaved = savedRiesgos.some(
                            (r) =>
                              r.riesgo_identificado ===
                                riesgo.riesgo_identificado &&
                              r.id_analisis === selectedSession.id,
                          );
                          const isEditing = editingRiskIndex === index;

                          return (
                            <RiskCard
                              key={index}
                              riesgo={riesgo}
                              index={index}
                              isEditing={isEditing}
                              alreadySaved={alreadySaved}
                              editedRiskData={editedRiskData}
                              setEditedRiskData={setEditedRiskData}
                              expandedRiskIndices={expandedRiskIndices}
                              toggleExpandRisk={toggleExpandRisk}
                              setEditingRiskIndex={setEditingRiskIndex}
                              handleSaveRiskChanges={handleSaveRiskChanges}
                              handleSaveToBC={handleSaveToBC}
                              handleStartEdit={handleStartEdit}
                            />
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
