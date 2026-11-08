import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingProps {
  text?: string;
  size?: number;
}

export const Loading: React.FC<LoadingProps> = ({ text = 'Загрузка данных...', size = 32 }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        color: 'var(--text-muted)',
        gap: '0.75rem',
      }}
    >
      <Loader2
        size={size}
        className="animate-spin"
        style={{
          color: 'var(--teal-600)',
          animation: 'spin 1s linear infinite',
        }}
      />
      {text && <span style={{ fontSize: '0.875rem' }}>{text}</span>}
    </div>
  );
};
