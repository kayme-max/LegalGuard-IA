import { useState } from "react";
import { View, User } from "../types";
import {
  FileText,
  History,
  BookOpen,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings
} from "lucide-react";
import logoUrl from "../assets/LEGALIA-1.png";

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogout: () => void;
}

export default function Sidebar({
  currentView,
  setCurrentView,
  isOpen,
  onClose,
  currentUser,
  onLogout,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      id: "identificar" as View,
      label: "Identificar Riesgos",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: "historial" as View,
      label: "Historial de Análisis",
      icon: <History className="w-5 h-5" />,
    },
    {
      id: "conocimiento" as View,
      label: "Base de Conocimiento",
      icon: <BookOpen className="w-5 h-5" />,
    },
    ...(currentUser?.role === 'admin' ? [{
      id: "administrar" as View,
      label: "Administrar Sistema",
      icon: <Settings className="w-5 h-5" />,
    }] : []),
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
          className="lg:hidden fixed inset-0 bg-[#0D1B2A]/80 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 bg-[#0D1B2A] text-slate-100 flex flex-col z-50 transition-all duration-300 transform lg:translate-x-0 shrink-0 border-r border-slate-800/50 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-20 w-64" : "w-64"}`}
      >
        {/* Header Branding */}
        <div
          className={`p-6 border-b border-slate-800/50 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-700 shadow-md">
              <img
                src={logoUrl}
                alt="Legalia Logo"
                className="w-full h-full object-cover"
              />
            </div>
            {!isCollapsed && (
              <div className="whitespace-nowrap transition-opacity duration-300">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  LEGALIA
                </span>
                <p className="text-[10px] text-[#00D4FF] uppercase tracking-widest font-bold mt-0.5">
                  ASISTENTE LEGAL CON IA
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center p-3.5 rounded-xl transition-all cursor-pointer group ${
                  isActive
                    ? "bg-[#1E3A8A] text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                } ${isCollapsed ? "justify-center" : "justify-start gap-4"}`}
                title={isCollapsed ? item.label : undefined}
              >
                <div
                  className={`transition-colors shrink-0 ${isActive ? "text-[#00D4FF]" : "text-slate-500 group-hover:text-[#00D4FF]"}`}
                >
                  {item.icon}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 text-left whitespace-nowrap">
                    <p className="text-sm font-semibold tracking-wide leading-none">
                      {item.label}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        {currentUser && (
          <div className="p-4 border-t border-slate-800/50 flex flex-col gap-2">
            <div
              className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isCollapsed ? "justify-center" : ""}`}
            >
              <div className="w-10 h-10 rounded-full bg-[#1E3A8A] border border-[#00D4FF]/30 flex items-center justify-center shrink-0">
                <span className="text-white font-bold">
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {currentUser.email}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={onLogout}
              className={`w-full flex items-center ${isCollapsed ? "justify-center" : "justify-start gap-2 px-3"} py-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition-colors mt-2 cursor-pointer`}
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <span className="text-xs font-medium tracking-wide">
                  Cerrar Sesión
                </span>
              )}
            </button>
          </div>
        )}

        {/* Collapse Toggle Button (Desktop Only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center p-3 border-t border-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </aside>
    </>
  );
}
