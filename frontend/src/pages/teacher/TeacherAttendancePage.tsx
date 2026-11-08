import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  Save,
  Users,
  XCircle,
} from 'lucide-react';
import { groupsApi } from '../../api/groups';
import { attendanceApi } from '../../api/attendance';
import { AttendanceItem, AttendanceStatus, Group } from '../../types/domain';
import { getTodayDateString, isPastDate } from '../../utils/dates';
import { formatDateTime } from '../../utils/formatters';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { Loading } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/EmptyState';
import { ApiError } from '../../api/client';

export const TeacherAttendancePage: React.FC = () => {
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const isReadOnly = isPastDate(selectedDate);

  // Load teacher's assigned groups
  useEffect(() => {
    let mounted = true;
    const fetchGroups = async () => {
      setLoadingGroups(true);
      setError(null);
      try {
        const res = await groupsApi.getTeacherTodayGroups();
        if (mounted) {
          setGroups(res);
          if (res.length > 0) {
            setSelectedGroupId(res[0].id);
          }
        }
      } catch (err) {
        if (mounted) {
          setError('Не удалось загрузить назначенные группы. Попробуйте обновить страницу.');
        }
      } finally {
        if (mounted) setLoadingGroups(false);
      }
    };
    fetchGroups();
    return () => {
      mounted = false;
    };
  }, []);

  // Load attendance when group or date changes
  const loadAttendance = useCallback(async () => {
    if (!selectedGroupId) return;
    setLoadingAttendance(true);
    setError(null);
    setSuccessMessage(null);
    setConflictWarning(null);

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
        setError('Не удалось загрузить посещаемость на выбранную дату.');
      }
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedGroupId, selectedDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Compute dirty items count
  const hasUnsavedChanges = JSON.stringify(items) !== JSON.stringify(originalItems);
  const changedCount = items.filter((item, index) => {
    const orig = originalItems[index];
    return !orig || orig.status !== item.status;
  }).length;

  const handleStatusChange = (childId: number, newStatus: AttendanceStatus) => {
    if (isReadOnly) return;
    setItems((prev) =>
      prev.map((item) => (item.childId === childId ? { ...item, status: newStatus } : item))
    );
  };

  const handleBulkPresent = () => {
    if (isReadOnly) return;
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

  const handleSave = async () => {
    if (!selectedGroupId || isReadOnly) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    setConflictWarning(null);

    try {
      const payload = {
        items: items.map((item) => ({
          childId: item.childId,
          status: item.status,
          version: item.version,
        })),
        reason: '',
      };

      const res = await attendanceApi.saveAttendance(selectedGroupId, selectedDate, payload);
      setItems(res.items || []);
      setOriginalItems(JSON.parse(JSON.stringify(res.items || [])));
      setSuccessMessage('Отметки посещаемости успешно сохранены.');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setConflictWarning(
            'Конфликт одновременного редактирования! Данные были изменены другим пользователем. Пожалуйста, перезагрузите данные и повторите сохранение.'
          );
        } else {
          setError(err.detail || err.title || 'Ошибка при сохранении отметок');
        }
      } else {
        setError('Произошла непредвиденная ошибка при сохранении.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingGroups) {
    return <Loading text="Загрузка назначенных групп..." />;
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<Users size={48} style={{ color: 'var(--navy-300)' }} />}
        title="Нет назначенных групп"
        description="На сегодня вам не назначено ни одной группы. Обратитесь к администратору детского сада."
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Журнал посещаемости</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Отметка детей группы за сегодня
          </p>
        </div>

        <div className="page-header-actions">
          {hasUnsavedChanges && !isReadOnly && (
            <>
              <Button variant="secondary" size="sm" onClick={handleResetChanges} disabled={saving}>
                <RotateCcw size={15} />
                Отменить правки
              </Button>
              <Button variant="primary" size="md" onClick={handleSave} loading={saving}>
                <Save size={16} />
                Сохранить ({changedCount})
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}
      {successMessage && <Alert type="success" className="mb-4">{successMessage}</Alert>}
      {conflictWarning && (
        <Alert type="warning" className="mb-4">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span>{conflictWarning}</span>
            <div>
              <Button variant="secondary" size="sm" onClick={loadAttendance}>
                Перезагрузить актуальные данные
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {/* Control bar: group select, date picker */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ minWidth: '220px' }}>
          <label className="form-label" style={{ marginBottom: '0.25rem' }}>Группа</label>
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
          <label className="form-label" style={{ marginBottom: '0.25rem' }}>Дата</label>
          <input
            type="date"
            className="form-input"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={saving}
          />
        </div>

        {!isReadOnly && workingDay && !closed && (
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
        )}
      </div>

      {/* Status alerts */}
      {isReadOnly && (
        <Alert type="info" className="mb-4">
          <Calendar size={18} style={{ marginRight: '0.5rem' }} />
          Просмотр прошедшей даты — только чтение. Изменение отметок за прошлые дни выполняет администратор.
        </Alert>
      )}

      {closed && (
        <Alert type="warning" className="mb-4">
          Сад внепланово закрыт в этот день. Дети освобождены от посещения.
        </Alert>
      )}

      {!workingDay && (
        <Alert type="warning" className="mb-4">
          Выходной или нерабочий день по календарю.
        </Alert>
      )}

      {/* Attendance Table */}
      {loadingAttendance ? (
        <Loading text="Загрузка списка детей..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Users size={40} style={{ color: 'var(--navy-300)' }} />}
          title="В группе нет детей"
          description="На эту дату в группе нет активных зачисленных детей."
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>ФИО ребёнка</th>
                <th style={{ width: '220px' }}>Статус посещаемости</th>
                <th>Быстрые действия</th>
                <th>Последнее обновление</th>
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
                        {isItemDirty && <Badge variant="teal">Не сохранено</Badge>}
                      </div>
                    </td>
                    <td>
                      {item.status === 'PRESENT' && (
                        <Badge variant="green">
                          <CheckCircle2 size={13} />
                          Присутствует
                        </Badge>
                      )}
                      {item.status === 'ABSENT' && (
                        <Badge variant="red">
                          <XCircle size={13} />
                          Отсутствует
                        </Badge>
                      )}
                      {item.status === null && (
                        <Badge variant="gray">
                          <Clock size={13} />
                          Не отмечено
                        </Badge>
                      )}
                    </td>
                    <td>
                      {!isReadOnly ? (
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${item.status === 'PRESENT' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => handleStatusChange(item.childId, 'PRESENT')}
                            disabled={saving}
                          >
                            <CheckCircle2 size={14} />
                            Пришёл
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${item.status === 'ABSENT' ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => handleStatusChange(item.childId, 'ABSENT')}
                            disabled={saving}
                          >
                            <XCircle size={14} />
                            Не пришёл
                          </button>
                          {item.status !== null && (
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleStatusChange(item.childId, null)}
                              disabled={saving}
                              title="Сбросить в 'Не отмечено'"
                            >
                              Сброс
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontSize: '0.8125rem' }}>
                          Редактирование заблокировано
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.updatedAt ? formatDateTime(item.updatedAt) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
