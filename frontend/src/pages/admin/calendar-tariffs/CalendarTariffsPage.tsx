import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  Info,
  Plus,
  RotateCcw,
  Save,
  Tag,
} from 'lucide-react';
import { calendarApi } from '../../../api/calendar';
import { tariffsApi } from '../../../api/tariffs';
import { CalendarDay, CalendarMonth, Tariff } from '../../../types/domain';
import { Page } from '../../../types/api';
import { formatDate, formatMoney } from '../../../utils/formatters';
import { getCurrentMonthString, getTodayDateString } from '../../../utils/dates';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Badge } from '../../../components/common/Badge';
import { Alert } from '../../../components/common/Alert';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { Modal } from '../../../components/common/Modal';
import { ApiError } from '../../../api/client';

export const CalendarTariffsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'tariffs'>('calendar');

  // --- Calendar State ---
  const currentMonthStr = getCurrentMonthString(); // YYYY-MM
  const [selectedMonthStr, setSelectedMonthStr] = useState(currentMonthStr);
  const [calendarData, setCalendarData] = useState<CalendarMonth | null>(null);
  const [originalDays, setOriginalDays] = useState<CalendarDay[]>([]);
  const [editingDays, setEditingDays] = useState<CalendarDay[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarSuccess, setCalendarSuccess] = useState<string | null>(null);

  // Day Edit Modal
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [dayType, setDayType] = useState<'WORKING' | 'WEEKEND' | 'HOLIDAY' | 'CLOSURE'>('WORKING');
  const [dayReason, setDayReason] = useState('');

  // --- Tariffs State ---
  const [tariffsPage, setTariffsPage] = useState<Page<Tariff>>({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  const [loadingTariffs, setLoadingTariffs] = useState(true);
  const [tariffsError, setTariffsError] = useState<string | null>(null);

  // Tariff Modal
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [tariffAgeFrom, setTariffAgeFrom] = useState<number>(0);
  const [tariffAgeTo, setTariffAgeTo] = useState<number | ''>('');
  const [tariffAmount, setTariffAmount] = useState<number>(50000);
  const [tariffValidFrom, setTariffValidFrom] = useState(getTodayDateString());
  const [tariffValidTo, setTariffValidTo] = useState('');
  const [tariffReason, setTariffReason] = useState('');
  const [tariffSaving, setTariffSaving] = useState(false);

  // --- Fetch Calendar ---
  const fetchCalendar = useCallback(async () => {
    setLoadingCalendar(true);
    setCalendarError(null);
    setCalendarSuccess(null);
    try {
      const [yearStr, monthStr] = selectedMonthStr.split('-');
      const year = Number(yearStr);
      const monthNum = Number(monthStr);

      const res = await calendarApi.getCalendar(year, monthNum);
      setCalendarData(res);
      setOriginalDays(JSON.parse(JSON.stringify(res.days || [])));
      setEditingDays(JSON.parse(JSON.stringify(res.days || [])));
    } catch {
      setCalendarError('Не удалось загрузить календарь на выбранный месяц.');
    } finally {
      setLoadingCalendar(false);
    }
  }, [selectedMonthStr]);

  // --- Fetch Tariffs ---
  const fetchTariffs = useCallback(async () => {
    setLoadingTariffs(true);
    setTariffsError(null);
    try {
      const res = await tariffsApi.getTariffs({ size: 50 });
      setTariffsPage(res);
    } catch {
      setTariffsError('Не удалось загрузить тарифные сетки.');
    } finally {
      setLoadingTariffs(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
    fetchTariffs();
  }, [fetchCalendar, fetchTariffs]);

  // Check unsaved calendar changes
  const hasCalendarChanges = JSON.stringify(originalDays) !== JSON.stringify(editingDays);

  const handleOpenDayModal = (day: CalendarDay) => {
    setSelectedDay(day);
    if (day.closed && day.baseWorking) {
      setDayType('CLOSURE');
    } else if (!day.baseWorking && day.reason) {
      setDayType('HOLIDAY');
    } else if (!day.baseWorking) {
      setDayType('WEEKEND');
    } else {
      setDayType('WORKING');
    }
    setDayReason(day.reason || '');
  };

  const handleSaveDayInModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;

    let baseWorking = true;
    let closed = false;

    if (dayType === 'WORKING') {
      baseWorking = true;
      closed = false;
    } else if (dayType === 'WEEKEND') {
      baseWorking = false;
      closed = false;
    } else if (dayType === 'HOLIDAY') {
      baseWorking = false;
      closed = false;
    } else if (dayType === 'CLOSURE') {
      baseWorking = true;
      closed = true;
    }

    const updated: CalendarDay = {
      ...selectedDay,
      baseWorking,
      closed,
      reason: dayReason.trim() || null,
    };

    setEditingDays((prev) => prev.map((d) => (d.date === selectedDay.date ? updated : d)));
    setSelectedDay(null);
  };

  const handleSaveCalendar = async () => {
    setSavingCalendar(true);
    setCalendarError(null);
    setCalendarSuccess(null);
    try {
      const [yearStr, monthStr] = selectedMonthStr.split('-');
      const res = await calendarApi.updateCalendar(Number(yearStr), Number(monthStr), editingDays);
      setCalendarData(res);
      setOriginalDays(JSON.parse(JSON.stringify(res.days || [])));
      setEditingDays(JSON.parse(JSON.stringify(res.days || [])));
      setCalendarSuccess('Календарь месяца успешно сохранён.');
    } catch (err) {
      if (err instanceof ApiError) {
        setCalendarError(err.detail || err.title || 'Ошибка сохранения календаря');
      } else {
        setCalendarError('Не удалось сохранить изменения календаря.');
      }
    } finally {
      setSavingCalendar(false);
    }
  };

  // --- Handlers: Tariffs ---
  const handleTariffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTariffSaving(true);
    setTariffsError(null);

    try {
      if (editingTariff) {
        await tariffsApi.updateTariff(editingTariff.id, {
          ageFrom: tariffAgeFrom,
          ageToExclusive: tariffAgeTo === '' ? null : Number(tariffAgeTo),
          monthlyAmount: tariffAmount,
          validFrom: tariffValidFrom,
          validTo: tariffValidTo || null,
          reason: tariffReason.trim(),
          version: editingTariff.version,
        });
      } else {
        await tariffsApi.createTariff({
          ageFrom: tariffAgeFrom,
          ageToExclusive: tariffAgeTo === '' ? null : Number(tariffAgeTo),
          monthlyAmount: tariffAmount,
          validFrom: tariffValidFrom,
          validTo: tariffValidTo || null,
        });
      }

      setIsTariffModalOpen(false);
      fetchTariffs();
    } catch (err) {
      if (err instanceof ApiError) {
        setTariffsError(err.detail || err.title || 'Ошибка сохранения тарифа');
      }
    } finally {
      setTariffSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Календарь и тарифные ставки</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Настройка рабочих дней, праздников, внеплановых закрытий и возрастных тарифов питания
          </p>
        </div>

        <div className="page-header-actions">
          {activeTab === 'calendar' ? (
            hasCalendarChanges && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingDays(JSON.parse(JSON.stringify(originalDays)))}
                  disabled={savingCalendar}
                >
                  <RotateCcw size={14} /> Отменить изменения
                </Button>
                <Button variant="primary" size="md" onClick={handleSaveCalendar} loading={savingCalendar}>
                  <Save size={15} /> Сохранить календарь
                </Button>
              </>
            )
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                setEditingTariff(null);
                setTariffAgeFrom(0);
                setTariffAgeTo('');
                setTariffAmount(50000);
                setTariffValidFrom(getTodayDateString());
                setTariffValidTo('');
                setTariffReason('');
                setIsTariffModalOpen(true);
              }}
            >
              <Plus size={16} /> Создать тарифную версию
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar size={16} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
          Рабочий календарь сада
        </button>
        <button
          className={`tab-btn ${activeTab === 'tariffs' ? 'active' : ''}`}
          onClick={() => setActiveTab('tariffs')}
        >
          <Tag size={16} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
          Возрастные тарифы
        </button>
      </div>

      {/* --- TAB 1: Calendar --- */}
      {activeTab === 'calendar' && (
        <div>
          {calendarError && <Alert type="error" className="mb-4">{calendarError}</Alert>}
          {calendarSuccess && <Alert type="success" className="mb-4">{calendarSuccess}</Alert>}

          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem' }}>Месяц календаря</label>
              <input
                type="month"
                className="form-input"
                value={selectedMonthStr}
                onChange={(e) => setSelectedMonthStr(e.target.value)}
              />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }} />
                <span>Рабочий день</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f1f5f9' }} />
                <span>Выходной</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--amber-100)' }} />
                <span>Праздник</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--red-100)' }} />
                <span>Внеплановое закрытие</span>
              </div>
            </div>
          </div>

          <Alert type="info" className="mb-4">
            <Info size={16} style={{ marginRight: '0.5rem', flexShrink: 0 }} />
            <span>
              <strong>Правило начисления:</strong> Праздники и выходные исключаются как из числителя, так и из знаменателя рабочих дней.
              <strong> Внеплановое закрытие</strong> сохраняет день в общем знаменателе, но освобождает родителей от оплаты этого дня.
            </span>
          </Alert>

          {loadingCalendar ? (
            <Loading text="Загрузка календаря..." />
          ) : !calendarData || editingDays.length === 0 ? (
            <EmptyState title="Календарь не загружен" description="Не удалось сформировать дни месяца." />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {editingDays.map((day) => {
                const isWorking = day.baseWorking && !day.closed;
                const isWeekend = !day.baseWorking && !day.reason;
                const isHoliday = !day.baseWorking && !!day.reason;
                const isClosure = day.closed;

                let bg = '#ffffff';
                let border = 'var(--border-color)';
                let badgeText = 'Рабочий';
                let badgeVariant: 'gray' | 'green' | 'amber' | 'red' = 'green';

                if (isClosure) {
                  bg = 'var(--red-50)';
                  border = 'var(--red-200)';
                  badgeText = 'Закрытие';
                  badgeVariant = 'red';
                } else if (isHoliday) {
                  bg = 'var(--amber-50)';
                  border = 'var(--amber-200)';
                  badgeText = 'Праздник';
                  badgeVariant = 'amber';
                } else if (isWeekend) {
                  bg = '#f8fafc';
                  border = 'var(--border-color)';
                  badgeText = 'Выходной';
                  badgeVariant = 'gray';
                }

                const dayNum = day.date.split('-')[2];

                return (
                  <div
                    key={day.date}
                    onClick={() => handleOpenDayModal(day)}
                    style={{
                      backgroundColor: bg,
                      border: `1px solid ${border}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '88px',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                        {dayNum}
                      </span>
                      <Badge variant={badgeVariant}>{badgeText}</Badge>
                    </div>

                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {day.reason || (isWorking ? 'Обычный день' : isWeekend ? 'Суббота/Воскресенье' : '')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: Tariffs --- */}
      {activeTab === 'tariffs' && (
        <div>
          {tariffsError && <Alert type="error" className="mb-4">{tariffsError}</Alert>}

          <Alert type="info" className="mb-4">
            <Info size={16} style={{ marginRight: '0.5rem', flexShrink: 0 }} />
            <span>
              Возрастная категория ребёнка определяется на последний календарный день расчётного месяца.
              Поэтому при наступлении дня рождения новый тариф действует на весь расчётный месяц.
            </span>
          </Alert>

          {loadingTariffs ? (
            <Loading text="Загрузка возрастных тарифов..." />
          ) : tariffsPage.content.length === 0 ? (
            <EmptyState
              title="Тарифы не найдены"
              description="В системе отсутствуют записи тарифов."
            />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Возрастной диапазон</th>
                    <th>Стоимость в месяц</th>
                    <th>Действует с</th>
                    <th>Действует по</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {tariffsPage.content.map((tariff) => {
                    const ageLabel =
                      tariff.ageToExclusive === null
                        ? `От ${tariff.ageFrom} лет и старше`
                        : `От ${tariff.ageFrom} до ${tariff.ageToExclusive} лет`;

                    return (
                      <tr key={tariff.id}>
                        <td style={{ fontWeight: 600 }}>{ageLabel}</td>
                        <td className="amount" style={{ fontWeight: 700, color: 'var(--teal-700)' }}>
                          {formatMoney(tariff.monthlyAmount)}
                        </td>
                        <td>{formatDate(tariff.validFrom)}</td>
                        <td>{tariff.validTo ? formatDate(tariff.validTo) : 'Бессрочно'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingTariff(tariff);
                              setTariffAgeFrom(tariff.ageFrom);
                              setTariffAgeTo(tariff.ageToExclusive ?? '');
                              setTariffAmount(tariff.monthlyAmount);
                              setTariffValidFrom(tariff.validFrom);
                              setTariffValidTo(tariff.validTo || '');
                              setTariffReason('');
                              setIsTariffModalOpen(true);
                            }}
                          >
                            Редактировать
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Day Edit Modal */}
      <Modal
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={`Настройка дня: ${selectedDay ? formatDate(selectedDay.date) : ''}`}
      >
        <form onSubmit={handleSaveDayInModal}>
          <div className="form-group">
            <label className="form-label">Тип дня</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${dayType === 'WORKING' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDayType('WORKING')}
              >
                Рабочий день
              </button>
              <button
                type="button"
                className={`btn btn-sm ${dayType === 'WEEKEND' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDayType('WEEKEND')}
              >
                Выходной день
              </button>
              <button
                type="button"
                className={`btn btn-sm ${dayType === 'HOLIDAY' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDayType('HOLIDAY')}
              >
                Гос. праздник
              </button>
              <button
                type="button"
                className={`btn btn-sm ${dayType === 'CLOSURE' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setDayType('CLOSURE')}
              >
                Внеплановое закрытие
              </button>
            </div>
          </div>

          <Input
            label="Причина / Название праздника или закрытия"
            value={dayReason}
            onChange={(e) => setDayReason(e.target.value)}
            placeholder="Например: Наурыз мейрамы или Санитарный день"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setSelectedDay(null)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary">
              Применить к дню
            </Button>
          </div>
        </form>
      </Modal>

      {/* Tariff Create/Edit Modal */}
      <Modal
        isOpen={isTariffModalOpen}
        onClose={() => setIsTariffModalOpen(false)}
        title={editingTariff ? 'Редактирование тарифа' : 'Новая тарифная версия'}
      >
        <form onSubmit={handleTariffSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input
              label="Возраст от (полных лет)"
              type="number"
              min="0"
              value={tariffAgeFrom}
              onChange={(e) => setTariffAgeFrom(Number(e.target.value))}
              required
            />
            <Input
              label="Возраст до (исключая)"
              type="number"
              min="1"
              value={tariffAgeTo}
              onChange={(e) => setTariffAgeTo(e.target.value === '' ? '' : Number(e.target.value))}
              hint="Оставьте пустым для неограниченного возраста"
            />
          </div>

          <Input
            label="Стоимость питания в месяц (₸)"
            type="number"
            min="0"
            value={tariffAmount}
            onChange={(e) => setTariffAmount(Number(e.target.value))}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input
              label="Действует с"
              type="date"
              value={tariffValidFrom}
              onChange={(e) => setTariffValidFrom(e.target.value)}
              required
            />
            <Input
              label="Действует по"
              type="date"
              value={tariffValidTo}
              onChange={(e) => setTariffValidTo(e.target.value)}
              hint="Пусто — бессрочно"
            />
          </div>

          {editingTariff && (
            <Input
              label="Обязательная причина изменения"
              value={tariffReason}
              onChange={(e) => setTariffReason(e.target.value)}
              required
              placeholder="Обоснование для аудита"
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsTariffModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={tariffSaving}>
              Сохранить тариф
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
