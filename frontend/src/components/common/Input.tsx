import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label} {props.required && <span style={{ color: 'var(--red-600)' }}>*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`form-input ${error ? 'has-error' : ''} ${className}`}
          {...props}
        />
        {error && <div className="form-error">{error}</div>}
        {hint && !error && <div className="form-hint">{hint}</div>}
      </div>
    );
  }
);

Input.displayName = 'Input';
