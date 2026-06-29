import { useState, useEffect } from 'react';
import { Menu, Scale } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Modal, { ModalType } from './components/Modal';
import IdentificarRiesgos from './views/IdentificarRiesgos';
import HistorialRiesgos from './views/HistorialRiesgos';
import BaseConocimiento from './views/BaseConocimiento';
import { View, Riesgo, AnalysisSession } from './types';
import { useToast } from './components/ToastProvider';
import { RiesgosService } from './lib/api';

export default function App() {
  const { showToast } = useToast();
  const [currentView, setCurrentView] = useState<View>('identificar');
  const [viewParams, setViewParams] = useState<{ id?: string, from?: string }>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [savedRiesgos, setSavedRiesgos] = useState<Riesgo[]>(() => {
    const stored = localStorage.getItem('bd_local_riesgos');
    if (stored) {
      try { 
        const parsed = JSON.parse(stored);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    const fetchRiesgos = async () => {
      try {
        // Llamar directamente al servicio backend sin mock data
        const riesgos = await RiesgosService.getAll();
        if (riesgos && riesgos.length > 0) {
          const mappedRiesgos = riesgos.map(r => ({
            ...r,
            numero_riesgo: r.numero_riesgo || r.riesgo_id?.replace('#', '') || r.id || ''
          }));
          setSavedRiesgos(mappedRiesgos);
        }
      } catch (error) {
        console.warn("Could not fetch risks from backend, falling back to local storage.", error);
      }
    };
    fetchRiesgos();
  }, []);

  const [analysisHistory, setAnalysisHistory] = useState<AnalysisSession[]>(() => {
    const storedHistory = localStorage.getItem('analysis_history');
    if (storedHistory) {
      try { return JSON.parse(storedHistory); } catch (e) {}
    }
    return [];
  });
  
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
    title: '',
    message: '',
    type: 'info',
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('bd_local_riesgos', JSON.stringify(savedRiesgos));
  }, [savedRiesgos]);

  useEffect(() => {
    localStorage.setItem('analysis_history', JSON.stringify(analysisHistory));
  }, [analysisHistory]);

  const showModal = (config: Omit<typeof modalState, 'isOpen'>) => {
    setModalState({ ...config, isOpen: true });
  };

  const handleSaveRiesgo = (riesgo: Riesgo) => {
    showModal({
      type: 'confirm',
      title: 'Guardar en Base de Conocimiento',
      message: '¿Desea almacenar este riesgo en la Base de Conocimiento?\n\nEl riesgo se guardará localmente y alimentará el historial de contingencias para ser utilizado en futuros análisis.',
      showCancel: true,
      confirmText: 'Guardar Riesgo',
      onConfirm: async () => {
        if (!savedRiesgos.some(r => r.riesgo_identificado === riesgo.riesgo_identificado)) {
          const getPrefix = (r: Riesgo) => {
            let text = r.tipo_contrato || 'ART';
            text = text.replace(/[^a-zA-Z]/g, '').toUpperCase();
            return text.substring(0, 3) || 'ART';
          };
          const prefix = getPrefix(riesgo);
          const maxNum = savedRiesgos.reduce((max, r) => {
            const parts = r.numero_riesgo.split('-');
            const num = parts.length > 1 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
            return !isNaN(num) && num > max ? num : max;
          }, 0);
          const newIdString = `${prefix}-${String(maxNum + 1).padStart(5, '0')}`;
          
          const newRiesgo = { ...riesgo, numero_riesgo: newIdString, riesgo_id: `#${newIdString}` };
          setSavedRiesgos(prev => [...prev, newRiesgo]);
          
          try {
            await RiesgosService.create(newRiesgo);
          } catch (e) {
            console.warn("Failed to save to backend, saved locally", e);
          }

          setTimeout(() => {
            showToast('Riesgo guardado con éxito en la Base de Conocimiento.', 'success');
          }, 300);
        }
      }
    });
  };

  const handleManualEntry = async (riesgo: Riesgo) => {
    if (!riesgo.numero_riesgo) {
      const getPrefix = (r: Riesgo) => {
        let text = r.tipo_contrato || 'ART';
        text = text.replace(/[^a-zA-Z]/g, '').toUpperCase();
        return text.substring(0, 3) || 'ART';
      };
      const prefix = getPrefix(riesgo);
      const maxNum = savedRiesgos.reduce((max, r) => {
        const parts = r.numero_riesgo.split('-');
        const num = parts.length > 1 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      riesgo.numero_riesgo = `${prefix}-${String(maxNum + 1).padStart(5, '0')}`;
      riesgo.riesgo_id = `#${riesgo.numero_riesgo}`;
    }
    setSavedRiesgos(prev => [...prev, riesgo]);
    try {
      await RiesgosService.create(riesgo);
    } catch (e) {
      console.warn("Failed to save to backend, saved locally", e);
    }
  };

  const handleRestoreData = () => {
    showModal({
      type: 'danger',
      title: 'Restaurar Datos del Sistema',
      message: '¿Está seguro de que desea restaurar todos los datos? Se eliminará el historial, la base de conocimiento local y los formularios guardados. Esta acción no se puede deshacer.',
      showCancel: true,
      confirmText: 'Sí, Restaurar Todo',
      onConfirm: () => {
        localStorage.clear();
        window.location.reload();
      }
    });
  };

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
        onRestore={handleRestoreData}
      />

      {/* Mobile Header */}
      <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-500 rounded-lg">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-wide">LegalGuard AI</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0">
        {currentView === 'identificar' && (
          <IdentificarRiesgos 
            savedRiesgos={savedRiesgos}
            onNavigateToHistorial={(id?: string) => {
              if (id) {
                setViewParams({ id, from: 'identificar' });
              } else {
                setViewParams({});
              }
              setCurrentView('historial');
            }}
            onAnalysisComplete={(session) => setAnalysisHistory(prev => [session, ...prev])}
          />
        )}
        {currentView === 'historial' && (
          <HistorialRiesgos 
            history={analysisHistory} 
            initialSessionId={viewParams.id}
            onDeleteSession={(id) => setAnalysisHistory(prev => prev.filter(s => s.id !== id))}
            onSaveRiesgo={handleSaveRiesgo}
            savedRiesgosIds={savedRiesgos.map(r => r.riesgo_identificado)}
            savedRiesgos={savedRiesgos}
            onBack={() => {
              if (viewParams.from === 'identificar') {
                setCurrentView('identificar');
                setViewParams({});
              }
            }}
          />
        )}
        {currentView === 'conocimiento' && (
          <BaseConocimiento
            savedRiesgos={savedRiesgos}
            onManualEntry={handleManualEntry}
            onEditRiesgo={async (updatedRiesgo) => {
              setSavedRiesgos(prev => prev.map(r => r.numero_riesgo === updatedRiesgo.numero_riesgo ? updatedRiesgo : r));
              try {
                const backendId = updatedRiesgo.id || updatedRiesgo.numero_riesgo;
                await RiesgosService.update(backendId, updatedRiesgo);
              } catch (e) {
                console.warn("Failed to update backend, updated locally", e);
              }
            }}
            onDeleteRiesgo={async (numero_riesgo) => {
              const deletedRiesgo = savedRiesgos.find(r => r.numero_riesgo === numero_riesgo);
              setSavedRiesgos(prev => prev.filter(r => r.numero_riesgo !== numero_riesgo));
              try {
                const backendId = deletedRiesgo?.id || numero_riesgo;
                await RiesgosService.delete(backendId);
              } catch (e) {
                console.warn("Failed to delete from backend, deleted locally", e);
              }
            }}
          />
        )}
      </main>

      <Modal 
        {...modalState} 
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}
