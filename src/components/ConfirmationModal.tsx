import { useEffect, ReactNode } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  isDestructive?: boolean;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmText,
  cancelText,
  type = 'info',
  isDestructive = false,
  isLoading = false,
}: ConfirmationModalProps) {
  const finalConfirmText = confirmLabel || confirmText || 'OK';
  const finalCancelText = cancelLabel || cancelText || 'Cancel';
  const finalIsDestructive = isDestructive || type === 'danger';
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        onConfirm();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleEnter);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleEnter);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel, onConfirm, isLoading]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            {type === 'danger' && (
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            )}
            {type === 'warning' && (
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            )}
            {type === 'info' && (
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
            )}
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="text-slate-700 leading-relaxed mb-6">
          {typeof message === 'string' ? <p className="text-lg">{message}</p> : message}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {finalCancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              finalIsDestructive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : type === 'warning'
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {finalConfirmText}
              </span>
            ) : (
              finalConfirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
