import React, { useEffect, useState, useCallback } from 'react';
import {
  Eye,
  Filter,
  History,
} from 'lucide-react';
import { auditApi } from '../../../api/audit';
import { AuditEvent } from '../../../types/domain';
import { Page } from '../../../types/api';
import { formatDateTime } from '../../../utils/formatters';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Alert } from '../../../components/common/Alert';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { Pagination } from '../../../components/common/Pagination';
import { Modal } from '../../../components/common/Modal';

export const AuditPage: React.FC = () => {
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [actorId, setActorId] = useState('');
  const [page, setPage] = useState(0);

  const [auditPage, setAuditPage] = useState<Page<AuditEvent>>({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector modal
  const [inspectEvent, setInspectEvent] = useState<AuditEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditApi.getAuditEvents({
        entityType: entityType.trim() || undefined,
        entityId: entityId.trim() || undefined,
        actorId: actorId.trim() || undefined,
        page,
        size: 20,
      });
      setAuditPage(res);
    } catch {
      setError('Не удалось загрузить журнал аудита.');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, actorId, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchEvents();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Журнал аудита системы</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Полная история изменений, действий пользователей, исходных и новых состояний объектов
          </p>
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label className="form-label">Тип сущности</label>
            <input
              type="text"
              className="form-input"
              placeholder="Child, Invoice, Attendance..."
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            />
          </div>

          <div style={{ width: '140px' }}>
            <label className="form-label">ID сущности</label>
            <input
              type="text"
              className="form-input"
              placeholder="Например: 12"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
            />
          </div>

          <div style={{ width: '140px' }}>
            <label className="form-label">ID пользователя</label>
            <input
              type="text"
              className="form-input"
              placeholder="ID автора"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
            />
          </div>

          <Button type="submit" variant="secondary" style={{ height: '38px' }}>
            <Filter size={15} /> Применить фильтр
          </Button>
        </form>
      </div>

      {/* Audit Table */}
      {loading ? (
        <Loading text="Загрузка журнала аудита..." />
      ) : auditPage.content.length === 0 ? (
        <EmptyState
          icon={<History size={40} style={{ color: 'var(--navy-300)' }} />}
          title="Событий аудита не найдено"
          description="По заданным критериям фильтрации записей нет."
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Время события</th>
                <th>Пользователь</th>
                <th>Сущность</th>
                <th>Действие</th>
                <th>Причина</th>
                <th>Детали изменений</th>
              </tr>
            </thead>
            <tbody>
              {auditPage.content.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ fontSize: '0.8125rem' }}>{formatDateTime(ev.occurredAt)}</td>
                  <td style={{ fontWeight: 600 }}>{ev.actorLogin || `ID #${ev.actorId}`}</td>
                  <td>
                    <Badge variant="teal">
                      {ev.entityType} #{ev.entityId}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant="gray">{ev.action}</Badge>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>{ev.reason || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setInspectEvent(ev)}
                    >
                      <Eye size={13} /> До / После
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={auditPage.page}
            totalPages={auditPage.totalPages}
            totalElements={auditPage.totalElements}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Inspector Modal */}
      <Modal
        isOpen={!!inspectEvent}
        onClose={() => setInspectEvent(null)}
        title={`Аудит #${inspectEvent?.id}: ${inspectEvent?.entityType} #${inspectEvent?.entityId} (${inspectEvent?.action})`}
        maxWidth="800px"
      >
        {inspectEvent && (
          <div>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <span>
                Автор: <strong style={{ color: 'var(--navy-900)' }}>{inspectEvent.actorLogin}</strong>
              </span>
              <span>
                Время: <strong style={{ color: 'var(--navy-900)' }}>{formatDateTime(inspectEvent.occurredAt)}</strong>
              </span>
              <span>
                Причина: <strong style={{ color: 'var(--navy-900)' }}>{inspectEvent.reason || 'Не указана'}</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--navy-800)', marginBottom: '0.5rem' }}>
                  Состояние ДО (Before)
                </h4>
                <pre
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    maxHeight: '350px',
                  }}
                >
                  {inspectEvent.before
                    ? JSON.stringify(inspectEvent.before, null, 2)
                    : '(нет данных / создание нового объекта)'}
                </pre>
              </div>

              <div>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--navy-800)', marginBottom: '0.5rem' }}>
                  Состояние ПОСЛЕ (After)
                </h4>
                <pre
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    maxHeight: '350px',
                  }}
                >
                  {inspectEvent.after
                    ? JSON.stringify(inspectEvent.after, null, 2)
                    : '(объект удален или архивирован)'}
                </pre>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <Button variant="secondary" onClick={() => setInspectEvent(null)}>
                Закрыть
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
