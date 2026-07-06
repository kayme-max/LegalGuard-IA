import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar";
import Modal, { ModalType } from "./components/Modal";
import IdentificarRiesgos from "./views/IdentificarRiesgos";
import HistorialRiesgos from "./views/HistorialRiesgos";
import BaseConocimiento from "./views/BaseConocimiento";
import AdministrarSistema from "./views/AdministrarSistema";
import { View, Riesgo, AnalysisSession, User } from "./types";
import { useToast } from "./components/ToastProvider";
import { RiesgosService, AnalysisHistoryService } from "./lib/api";

import logoUrl from "./assets/LEGALIA-1.png";

export default function App() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: "admin-user",
    name: "Administrador",
    email: "admin@flesan.com.pe",
    role: "admin",
  });
  const [currentView, setCurrentView] = useState<View>("conocimiento");
  const [viewParams, setViewParams] = useState<{ id?: string; from?: string }>(
    {},
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [savedRiesgos, setSavedRiesgos] = useState<Riesgo[]>([]);

  useEffect(() => {
    const fetchRiesgos = async () => {
      try {
        // Llamar directamente al servicio backend
        const riesgos = await RiesgosService.getAll();
        if (riesgos && riesgos.length > 0) {
          const mappedRiesgos = riesgos.map((r) => ({
            ...r,
            numero_riesgo:
              r.numero_riesgo || r.riesgo_id?.replace("#", "") || r.id || "",
          }));
          setSavedRiesgos(mappedRiesgos);
        }
      } catch (error) {
        console.warn(
          "Could not fetch risks from backend.",
          error,
        );
      }
    };
    fetchRiesgos();
  }, []);

  const [analysisHistory, setAnalysisHistory] = useState<AnalysisSession[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await AnalysisHistoryService.getAll();
        if (history && history.length > 0) {
          setAnalysisHistory(history);
        }
      } catch (error) {
        console.warn(
          "Could not fetch history from backend.",
          error,
        );
      }
    };
    fetchHistory();
  }, []);

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: ModalType;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // Save history effects (removed localStorage)
  useEffect(() => {
    // No-op, persistence handled by backend
  }, [analysisHistory]);

  useEffect(() => {
    // No-op, persistence handled by backend
  }, [savedRiesgos]);

  const showModal = (config: Omit<typeof modalState, "isOpen">) => {
    setModalState({ ...config, isOpen: true });
  };

  const handleSaveRiesgo = (riesgo: Riesgo) => {
    showModal({
      type: "confirm",
      title: "Guardar en Base de Conocimiento",
      message:
        "¿Desea almacenar este riesgo en la Base de Conocimiento?\n\nEl riesgo se guardará localmente y alimentará el historial de contingencias para ser utilizado en futuros análisis.",
      showCancel: true,
      confirmText: "Guardar Riesgo",
      onConfirm: async () => {
        const isDuplicateInSession = savedRiesgos.some(
          (r) =>
            r.riesgo_identificado === riesgo.riesgo_identificado &&
            r.id_analisis === riesgo.id_analisis,
        );

        if (!isDuplicateInSession) {
          const getPrefix = (r: Riesgo) => {
            let text = r.tipo_contrato || "ART";
            text = text.replace(/[^a-zA-Z]/g, "").toUpperCase();
            return text.substring(0, 3) || "ART";
          };
          const prefix = getPrefix(riesgo);
          const maxNum = savedRiesgos.reduce((max, r) => {
            const parts = r.numero_riesgo.split("-");
            const num =
              parts.length > 1
                ? parseInt(parts[1], 10)
                : parseInt(parts[0], 10);
            return !isNaN(num) && num > max ? num : max;
          }, 0);
          const newIdString = `${prefix}-${String(maxNum + 1).padStart(5, "0")}`;

          const newRiesgo = {
            ...riesgo,
            numero_riesgo: newIdString,
            riesgo_id: `#${newIdString}`,
          };
          setSavedRiesgos((prev) => [...prev, newRiesgo]);

          try {
            await RiesgosService.create(newRiesgo);
          } catch (e) {
            console.warn("Failed to save to backend, saved locally", e);
          }

          setTimeout(() => {
            showToast(
              "Riesgo guardado con éxito en la Base de Conocimiento.",
              "success",
            );
          }, 300);
        }
      },
    });
  };

    const handleBulkEntry = async (riesgos: Riesgo[]) => {
    const newRiesgos = [...riesgos];
    
    // Generate IDs for those missing
    let currentMax = savedRiesgos.reduce((max, r) => {
      const parts = r.numero_riesgo.split("-");
      const num = parts.length > 1 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);

    for (const riesgo of newRiesgos) {
      if (!riesgo.numero_riesgo) {
        const getPrefix = (r: Riesgo) => {
          let text = r.tipo_contrato || "ART";
          text = text.replace(/[^a-zA-Z]/g, "").toUpperCase();
          return text.substring(0, 3) || "ART";
        };
        const prefix = getPrefix(riesgo);
        currentMax++;
        riesgo.numero_riesgo = `${prefix}-${String(currentMax).padStart(5, "0")}`;
        riesgo.riesgo_id = `#${riesgo.numero_riesgo}`;
      }
    }

    try {
      const createdRiesgos = [];
      for (const riesgo of newRiesgos) {
        const created = await RiesgosService.create(riesgo);
        createdRiesgos.push({ ...riesgo, id: created.id });
      }
      setSavedRiesgos((prev) => [...prev, ...createdRiesgos]);
    } catch (e) {
      console.warn("Failed to save some to backend, saved locally", e);
      setSavedRiesgos((prev) => [...prev, ...newRiesgos]);
    }
  };

  const handleManualEntry = async (riesgo: Riesgo) => {
    if (!riesgo.numero_riesgo) {
      const getPrefix = (r: Riesgo) => {
        let text = r.tipo_contrato || "ART";
        text = text.replace(/[^a-zA-Z]/g, "").toUpperCase();
        return text.substring(0, 3) || "ART";
      };
      const prefix = getPrefix(riesgo);
      const maxNum = savedRiesgos.reduce((max, r) => {
        const parts = r.numero_riesgo.split("-");
        const num =
          parts.length > 1 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      riesgo.numero_riesgo = `${prefix}-${String(maxNum + 1).padStart(5, "0")}`;
      riesgo.riesgo_id = `#${riesgo.numero_riesgo}`;
    }
    try {
      const createdRiesgo = await RiesgosService.create(riesgo);
      setSavedRiesgos((prev) => [...prev, { ...riesgo, id: createdRiesgo.id }]);
    } catch (e) {
      console.warn("Failed to save to backend, saved locally", e);
      setSavedRiesgos((prev) => [...prev, riesgo]);
    }
  };

  /*
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }
  */

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-100">
      <Sidebar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          setViewParams({});
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
      />

      {/* Mobile Header */}
      <div className="lg:hidden bg-[#0D1B2A] text-white p-4 flex items-center justify-between shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-slate-700 shadow-md bg-white">
            <img
              src={logoUrl}
              alt="Legalia Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">
            LEGALIA
          </span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0">
        {currentView === "identificar" && (
          <IdentificarRiesgos
            savedRiesgos={savedRiesgos}
            onNavigateToHistorial={(id?: string) => {
              if (id) {
                setViewParams({ id, from: "identificar" });
              } else {
                setViewParams({});
              }
              setCurrentView("historial");
            }}
            onAnalysisComplete={async (session) => {
              setAnalysisHistory((prev) => [session, ...prev]);
              try {
                await AnalysisHistoryService.create(session);
              } catch (error) {
                console.warn(
                  "Failed to save history session to backend, saved locally.",
                  error,
                );
              }
            }}
          />
        )}
        {currentView === "historial" && (
          <HistorialRiesgos
            history={analysisHistory}
            initialSessionId={viewParams.id}
            onDeleteSession={(id) => {
              showModal({
                type: "danger",
                title: "Eliminar Análisis",
                message:
                  "¿Está seguro de que desea eliminar este análisis del historial? Esta acción no se puede deshacer.",
                showCancel: true,
                confirmText: "Sí, Eliminar",
                onConfirm: async () => {
                  setAnalysisHistory((prev) => prev.filter((s) => s.id !== id));
                  try {
                    await AnalysisHistoryService.delete(id);
                  } catch (error) {
                    console.warn(
                      "Failed to delete history session from backend, deleted locally.",
                      error,
                    );
                  }
                  showToast("Análisis eliminado del historial.", "info");
                },
              });
            }}
            onUpdateSession={async (updatedSession) => {
              setAnalysisHistory((prev) =>
                prev.map((s) =>
                  s.id === updatedSession.id ? updatedSession : s,
                ),
              );
              try {
                await AnalysisHistoryService.update(
                  updatedSession.id,
                  updatedSession,
                );
              } catch (error) {
                console.warn(
                  "Failed to update history session in backend, updated locally.",
                  error,
                );
              }
            }}
            onSaveRiesgo={handleSaveRiesgo}
            savedRiesgos={savedRiesgos}
          />
        )}
        {currentView === "conocimiento" && (
          <BaseConocimiento
            savedRiesgos={savedRiesgos}
            onManualEntry={handleManualEntry}
            onBulkEntry={handleBulkEntry}
            onEditRiesgo={async (updatedRiesgo) => {
              setSavedRiesgos((prev) =>
                prev.map((r) =>
                  r.numero_riesgo === updatedRiesgo.numero_riesgo
                    ? updatedRiesgo
                    : r,
                ),
              );
              try {
                const backendId =
                  updatedRiesgo.id || updatedRiesgo.numero_riesgo;
                await RiesgosService.update(backendId, updatedRiesgo);
              } catch (e) {
                console.warn("Failed to update backend, updated locally", e);
              }
            }}
            onDeleteRiesgo={(numero_riesgo) => {
              showModal({
                type: "danger",
                title: "Eliminar Riesgo",
                message:
                  "¿Está seguro de que desea eliminar este riesgo de la Base de Conocimiento? Esta acción no se puede deshacer.",
                showCancel: true,
                confirmText: "Sí, Eliminar",
                onConfirm: async () => {
                  const deletedRiesgo = savedRiesgos.find(
                    (r) => r.numero_riesgo === numero_riesgo,
                  );
                  setSavedRiesgos((prev) =>
                    prev.filter((r) => r.numero_riesgo !== numero_riesgo),
                  );
                  try {
                    const backendId = deletedRiesgo?.id || numero_riesgo;
                    await RiesgosService.delete(backendId);
                    showToast(
                      "Riesgo eliminado de la Base de Conocimiento.",
                      "info",
                    );
                  } catch (e) {
                    console.warn(
                      "Failed to delete from backend, deleted locally",
                      e,
                    );
                    showToast("Riesgo eliminado localmente.", "info");
                  }
                },
              });
            }}
          />
        )}
        {currentView === "administrar" && (
          <AdministrarSistema />
        )}
      </main>

      <Modal
        {...modalState}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
