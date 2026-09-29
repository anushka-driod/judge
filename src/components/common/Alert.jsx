import React from 'react';
import { Info, AlertTriangle, CheckCircle, AlertCircle, X } from 'lucide-react';
import './Alert.css';

export function Alert({
  children,
  title,
  type = 'info', // 'info' | 'warning' | 'success' | 'danger'
  onClose,
  className = '',
}) {
  const icons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    danger: AlertCircle,
  };

  const Icon = icons[type] || Info;

  return (
    <div className={`alert alert-${type} ${className}`} role="alert">
      <Icon className="alert-icon" size={20} />
      <div className="alert-content">
        {title && <h4 className="alert-title">{title}</h4>}
        <div className="alert-body">{children}</div>
      </div>
      {onClose && (
        <button type="button" className="alert-close-btn" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
