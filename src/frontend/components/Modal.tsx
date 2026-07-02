import { AlertTriangle, AlertCircle, CheckCircle, Info, HelpCircle } from 'lucide-react';

export type ModalType = 'info' | 'success' | 'warning' | 'danger' | 'confirm';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: ModalType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}

export default function Modal({
  isOpen,
  title,
  message,
  type,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  showCancel = false,
  onConfirm,
  onClose,
}: ModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-emerald-500" />;
      case 'danger':
        return <AlertCircle className="w-12 h-12 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-amber-500" />;
      case 'confirm':
        return <HelpCircle className="w-12 h-12 text-indigo-500" />;
      case 'info':
      default:
        return <Info className="w-12 h-12 text-indigo-500" />;
    }
  };

  const getConfirmBtnColor = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white';
      case 'confirm':
      case 'info':
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full z-10 overflow-hidden transform scale-100 transition-all border border-slate-100">
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-4 p-3 bg-slate-50 rounded-full">
            {getIcon()}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 mb-2 leading-snug">
            {title}
          </h3>

          {/* Message */}
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line mb-6 max-w-md">
            {message}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            {(showCancel || type === 'confirm') && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${getConfirmBtnColor()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
