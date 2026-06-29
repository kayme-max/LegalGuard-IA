import { View } from '../types';
import { Scale, FileText, History, BookOpen, Trash2, X } from 'lucide-react';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
}

export default function Sidebar({
  currentView,
  setCurrentView,
  isOpen,
  onClose,
  onRestore,
}: SidebarProps) {
  const menuItems = [
    {
      id: 'identificar' as View,
      label: 'Identificar Riesgos',
      icon: <FileText className="w-5 h-5" />,
      description: 'Analizar nuevas licitaciones',
    },
    {
      id: 'historial' as View,
      label: 'Historial de Análisis',
      icon: <History className="w-5 h-5" />,
      description: 'Consultar reportes anteriores',
    },
    {
      id: 'conocimiento' as View,
      label: 'Base de Conocimiento',
      icon: <BookOpen className="w-5 h-5" />,
      description: 'Librería de riesgos guardados',
    },
  ];

  const handleNav = (view: View) => {
    setCurrentView(view);
    onClose();
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-80 bg-slate-900 text-slate-100 flex flex-col z-50 transition-transform duration-300 transform lg:translate-x-0 shrink-0 border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Branding */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-xl shadow-md">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                LegalGuard AI
              </span>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">
                Análisis de Licitaciones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-start gap-4 p-3.5 rounded-xl transition-all cursor-pointer text-left group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className={`mt-0.5 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold tracking-wide leading-none">{item.label}</p>
                  <p className={`text-[11px] mt-1 truncate ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* System Settings/Restore */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onRestore}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-dashed border-slate-800 hover:border-slate-700 text-xs font-semibold tracking-wider text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            RESTAURAR DATOS
          </button>
        </div>
      </aside>
    </>
  );
}
