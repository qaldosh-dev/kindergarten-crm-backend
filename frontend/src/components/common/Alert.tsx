import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export interface AlertProps {
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle size={18} className="flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle size={18} className="flex-shrink-0" />;
      case 'success':
        return <CheckCircle size={18} className="flex-shrink-0" />;
      case 'info':
      default:
        return <Info size={18} className="flex-shrink-0" />;
    }
  };

  return (
    <div className={`alert alert-${type} ${className}`}>
      <div style={{ marginTop: '2px' }}>{getIcon()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{title}</div>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
