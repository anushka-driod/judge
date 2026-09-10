import React, { forwardRef } from 'react';
import './Input.css';

export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    className = '',
    id,
    required = false,
    placeholder = 'Select an option',
    ...props
  },
  ref
) {
  const inputId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`input-group ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label} {required && <span className="required-star">*</span>}
        </label>
      )}
      <div className="select-wrapper">
        <select
          ref={ref}
          id={inputId}
          className="input-field select-field"
          required={required}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const isObj = typeof opt === 'object' && opt !== null;
            const val = isObj ? opt.value : opt;
            const lbl = isObj ? opt.label : opt;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
      </div>
      {error && <span className="input-error-msg">{error}</span>}
      {!error && helperText && <span className="input-helper-msg">{helperText}</span>}
    </div>
  );
});
