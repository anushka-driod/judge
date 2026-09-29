import React from 'react';
import './Badge.css';

export function Badge({
  children,
  variant = 'neutral', // 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size = 'md', // 'sm' | 'md'
  icon: Icon,
  className = '',
}) {
  return (
    <span className={`badge badge-${variant} badge-${size} ${className}`}>
      {Icon && <Icon size={12} className="badge-icon" />}
      <span>{children}</span>
    </span>
  );
}
