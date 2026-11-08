import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  Save,
  Users,
  XCircle,
} from 'lucide-react';
import { groupsApi } from '../../../api/groups';
import { attendanceApi } from '../../../api/attendance';
import { AttendanceItem, AttendanceStatus, Group } from '../../../types/domain';
import { getTodayDateString } from '../../../utils/dates';
import { formatDateTime } from '../../../utils/formatters';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Badge } from '../../../components/common/Badge';
import { Alert } from '../../../components/common/Alert';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/common/Modal';
import { ApiError } from '../../../api/client';

export const AdminAttendancePage: React.FC = () => {
  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [originalItems, setOriginalItems] = useState<AttendanceItem[]>([]);
  const [workingDay, setWorkingDay] = useState(true);
  const [closed, setClosed] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Saving state & modal for correction reason
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load active groups
  useEffect(() => {
    groupsApi.getGroups({ active: true, size: 100 })
      .then((res) => {
        setGroups(res.content || []);
        if (res.content?.length > 0) {
          setSelectedGroupId(res.content[0].id);
        }
      })
      .catch(() => setError('Не удалось загрузить список групп.'))
      .finally(() => setLoadingGroups(false));
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!selectedGroupId) return;
    setLoadingAttendance(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await attendanceApi.getAttendance(selectedGroupId, selectedDate);
      setWorkingDay(res.workingDay);
      setClosed(res.closed);
      setItems(res.items || []);
      setOriginalItems(JSON.parse(JSON.stringify(res.items || [])));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка загрузки посещаемости');
      } else {
        setError('Не удалось загрузить посещаемость на указанную дату.');
      }
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedGroupId, selectedDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const hasUnsavedChanges = JSON.stringify(items) !== JSON.stringify(originalItems);
  const changedCount = items.filter((item, index) => {
    const orig = originalItems[index];
    return !orig || orig.status !== item.status;
  }).length;

  const handleStatusChange = (childId: number, newStatus: AttendanceStatus) => {
    setItems((prev) =>
      prev.map((item) => (item.childId === childId ? { ...item, status: newStatus } : item))
    );
  };

  const handleBulkPresent = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'PRESENT',
      }))
    );
  };

  const handleResetChanges = () => {
    setItems(JSON.parse(JSON.stringify(originalItems)));
  };

  const handleOpenSaveModal = () => {
    setCorrectionReason(
      selectedDate === today ? '' : 'Исправление отметки администратором'
    );
    setIsConfirmModalOpen(true);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;

    if (selectedDate !== today && !correctionReason.trim()) {
      alert('Укажите обязательную причину исправления посещаемости за прошлую дату');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        items: items.map((item) => ({
          childId: item.childId,
          status: item.status,
          version: item.version,
        })),
        reason: correctionReason.trim(),
      };

      const res = await attendanceApi.saveAttendance(selectedGroupId, selectedDate, payload);
      setItems(res.items || []);
      setOriginalItems(JSON.parse(JSON.stringify(res.items || [])));
      setIsConfirmModalOpen(false);
      setSuccess('Отметки посещаемости успешно сохранены с фиксацией аудита.');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Конфликт оптимистичной блокировки! Данные изменились. Обновите страницу и повторите.');
        } else {
          setError(err.detail || err.title || 'Ошибка сохранения отметок');
        }
      } else {
        setError('Не удалось сохранить изменения.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingGroups) {
    return <Loading text="Загрузка списка групп..." />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Управление и исправление посещаемости</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Просмотр и корректировка отметок за любую дату с записью причины в аудит
          </p>
        </div>

        <div className="page-header-actions">
          {hasUnsavedChanges && (
            <>
              <Button variant="secondary" size="sm" onClick={handleResetChanges} disabled={saving}>
                <RotateCcw size={14} /> Отменить
              </Button>
              <Button variant="primary" size="md" onClick={handleOpenSaveModal} loading={saving}>
                <Save size={15} /> Сохранить изменения ({changedCount})
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}
      {success && <Alert type="success" className="mb-4">{success}</Alert>}

      {/* Selector Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ minWidth: '220px' }}>
          <label className="form-label">Группа</label>
          <select
            className="form-select"
            value={selectedGroupId || ''}
            onChange={(e) => setSelectedGroupId(Number(e.target.value))}
            disabled={saving}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '180px' }}>
          <label className="form-label">Дата посещаемости</label>
          <input
            type="date"
            className="form-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={saving}
          />
        </div>

        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', paddingTop: '1.25rem' }}>
          <Button
            variant="secondary"
            onClick={handleBulkPresent}
            disabled={loadingAttendance || saving || items.length === 0}
          >
            <CheckCircle2 size={16} style={{ color: 'var(--green-600)' }} />
            Все присутствуют
          </Button>
        </div>
      </div>

      {closed && (
        <Alert type="warning" className="mb-4">
          Сад внепланово закрыт в этот день по календарю.
        </Alert>
      )}

      {!workingDay && (
        <Alert type="warning" className="mb-4">
          Выходной или праздничный день по базовому календарю.
        </Alert>
      )}

      {/* Attendance Table */}
      {loadingAttendance ? (
        <Loading text="Загрузка списка детей..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Users size={40} style={{ color: 'var(--navy-300)' }} />}
          title="В группе нет детей"
          description="На эту дату в группе нет активных зачисленных воспитанников."
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>ФИО ребёнка</th>
                <th style={{ width: '200px' }}>Текущий статус</th>
                <th>Управление отметкой</th>
                <th>Кем обновлено</th>
                <th>Время обновления</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const orig = originalItems[index];
                const isItemDirty = orig && orig.status !== item.status;

                return (
                  <tr
                    key={item.childId}
                    style={{
                      backgroundColor: isItemDirty ? 'rgba(204, 251, 241, 0.25)' : undefined,
                    }}
                  >
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{item.fullName}</span>
                        {isItemDirty && <Badge variant="teal">Изменено</Badge>}
                      </div>
                    </td>
                    <td>
                      {item.status === 'PRESENT' && (
                        <Badge variant="green">
                          <CheckCircle2 size={13} /> Присутствует
                        </Badge>
                      )}
                      {item.status === 'ABSENT' && (
                        <Badge variant="red">
                          <XCircle size={13} /> Отсутствует
                        </Badge>
                      )}
                      {item.status === null && (
                        <Badge variant="gray">
                          <Clock size={13} /> Не отмечено
                        </Badge>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${item.status === 'PRESENT' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => handleStatusChange(item.childId, 'PRESENT')}
                        >
                          <CheckCircle2 size={14} /> Присутствовал
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${item.status === 'ABSENT' ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={() => handleStatusChange(item.childId, 'ABSENT')}
                        >
                          <XCircle size={14} /> Отсутствовал
                        </button>
                        {item.status !== null && (
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleStatusChange(item.childId, null)}
                          >
                            Сброс
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {item.updatedBy ? `Пользователь #${item.updatedBy}` : '—'}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {item.updatedAt ? formatDateTime(item.updatedAt) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Save Modal with Reason */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Сохранение изменений посещаемости"
      >
        <form onSubmit={handleSaveAttendance}>
          <Alert type="info" className="mb-4">
            Будут сохранены отметки для {changedCount} детей за дату {selectedDate}.
          </Alert>

          <Input
            label="Причина / Обоснование исправления"
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            required={selectedDate !== today}
            placeholder="Например: Заявление родителя, исправление ошибки"
            hint={selectedDate !== today ? 'Обязательно при правке прошедших дат' : 'Необязательно за сегодня'}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Зафиксировать отметки
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
