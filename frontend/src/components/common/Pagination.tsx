import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  page: number; // 0-based
  totalPages: number;
  totalElements?: number;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalElements,
  onPageChange,
}) => {
  if (totalPages <= 1 && (!totalElements || totalElements <= 0)) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
      }}
    >
      <div>
        {totalElements !== undefined && (
          <span>
            Всего записей: <strong className="num" style={{ color: 'var(--navy-900)' }}>{totalElements}</strong>
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span>
          Страница <strong className="num" style={{ color: 'var(--navy-900)' }}>{page + 1}</strong> из{' '}
          <strong className="num" style={{ color: 'var(--navy-900)' }}>{Math.max(1, totalPages)}</strong>
        </span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
            aria-label="Предыдущая страница"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            aria-label="Следующая страница"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};
