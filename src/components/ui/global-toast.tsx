'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  action?: string; // recovery instruction
}

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  showError: (title: string, description?: string, action?: string) => void;
  showSuccess: (title: string, description?: string) => void;
  showWarning: (title: string, description?: string, action?: string) => void;
  showInfo: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useGlobalToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useGlobalToast must be used within ToastProvider');
  return ctx;
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const config = {
    success: { icon: CheckCircle, bg: 'bg-ono-green-light border-ono-green', iconColor: 'text-ono-green', titleColor: 'text-ono-green-dark' },
    error: { icon: AlertCircle, bg: 'bg-red-50 border-red-400', iconColor: 'text-red-500', titleColor: 'text-red-800' },
    warning: { icon: AlertTriangle, bg: 'bg-orange-50 border-orange-400', iconColor: 'text-orange-500', titleColor: 'text-orange-800' },
    info: { icon: Info, bg: 'bg-blue-50 border-blue-400', iconColor: 'text-blue-500', titleColor: 'text-blue-800' },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      className={`${config.bg} border rounded-lg p-4 shadow-lg flex gap-3`}
      dir="rtl"
      style={{ animation: 'slideUpFade 0.3s ease-out' }}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${config.titleColor}`}>{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-gray-600 mt-1">{toast.description}</p>
        )}
        {toast.action && (
          <p className="text-xs font-medium mt-1.5 px-2 py-1 bg-white/60 rounded inline-block">
            {toast.action}
          </p>
        )}
      </div>
      <button onClick={onClose} className="shrink-0 p-0.5 hover:bg-black/5 rounded">
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...toast, id }]);
    const duration = toast.type === 'error' ? 20000 : toast.type === 'warning' ? 8000 : 4000;
    setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  const showError = useCallback((title: string, description?: string, action?: string) => {
    showToast({ type: 'error', title, description, action });
  }, [showToast]);

  const showSuccess = useCallback((title: string, description?: string) => {
    showToast({ type: 'success', title, description });
  }, [showToast]);

  const showWarning = useCallback((title: string, description?: string, action?: string) => {
    showToast({ type: 'warning', title, description, action });
  }, [showToast]);

  const showInfo = useCallback((title: string, description?: string) => {
    showToast({ type: 'info', title, description });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, showWarning, showInfo }}>
      {children}
      {/* Global toast container - fixed bottom center */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-md px-4 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onClose={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
