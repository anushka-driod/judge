import React, { forwardRef } from 'react';
import './Input.css';

export const TextArea = forwardRef(function TextArea(
  {
    label,
    error,
    helperText,
    className = '',
    id,
    rows = 4,
    required = false,
    ...props
  },
  ref
) {
  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`input-group ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label} {required && <span className="required-star">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className="input-field textarea-field"
        required={required}
        {...props}
      />
      {error && <span className="input-error-msg">{error}</span>}
      {!error && helperText && <span className="input-helper-msg">{helperText}</span>}
    </div>
  );
});
