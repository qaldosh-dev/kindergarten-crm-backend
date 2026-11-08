import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Inbox size={40} style={{ color: 'var(--navy-300)' }} />,
  title = 'Нет данных',
  description = 'Записей по вашему запросу не найдено.',
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3.5rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>{icon}</div>
      <h4 style={{ color: 'var(--navy-800)', marginBottom: '0.25rem' }}>{title}</h4>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '400px', marginBottom: action ? '1.25rem' : '0' }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
