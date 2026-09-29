import React from 'react';
import './Card.css';

export function Card({
  children,
  title,
  subtitle,
  action,
  hoverable = false,
  bordered = true,
  className = '',
  onClick,
  ...props
}) {
  return (
    <div
      className={`card ${hoverable ? 'card-hoverable' : ''} ${bordered ? 'card-bordered' : ''} ${className}`}
      onClick={onClick}
      {...props}
    >
      {(title || action) && (
        <div className="card-header">
          <div className="card-title-group">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return <div className={`card-footer ${className}`}>{children}</div>;
}
