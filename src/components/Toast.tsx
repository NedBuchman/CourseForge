import { useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, onClose, duration]);

  if (!isVisible) return null;

  const styles = {
    success: {
      bg: 'bg-green-600',
      icon: CheckCircle,
      iconColor: 'text-white',
    },
    error: {
      bg: 'bg-red-600',
      icon: AlertTriangle,
      iconColor: 'text-white',
    },
    info: {
      bg: 'bg-blue-600',
      icon: Info,
      iconColor: 'text-white',
    },
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slideInFromTop">
      <div
        className={`${style.bg} text-white rounded-lg shadow-2xl p-4 pr-12 max-w-md min-w-80 relative`}
      >
        <div className="flex items-start gap-3">
          <Icon className={`w-6 h-6 ${style.iconColor} flex-shrink-0 mt-0.5`} />
          <p className="text-white font-medium leading-relaxed">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
