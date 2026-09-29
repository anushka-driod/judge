import React from 'react';
import { useUI } from '../../hooks/useUI';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

export function ToastContainer() {
  const { toasts, removeToast } = useUI();

  if (!toasts || toasts.length === 0) return null;

  const icons = {
    success: CheckCircle2,
    danger: AlertCircle,
    warning: AlertCircle,
    info: Info,
  };

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = icons[toast.type] || Info;
        return (
          <div key={toast.id} className={`toast-card toast-${toast.type} animate-fade-in`}>
            <Icon size={18} className="toast-icon" />
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss toast"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
