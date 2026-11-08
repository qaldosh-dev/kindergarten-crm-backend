import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Calculator,
  FileText,
  Filter,
  RefreshCw,
  Send,
} from 'lucide-react';
import { billingApi } from '../../../api/billing';
import {
  Invoice,
  MonthCalculateResponse,
  ReconciliationPreview,
} from '../../../types/domain';
import { Page } from '../../../types/api';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatMonth,
  formatSignedMoney,
} from '../../../utils/formatters';
import {
  getCurrentMonthString,
  getDefaultDueDate,
  isPastDayTenOfMonth,
} from '../../../utils/dates';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Badge } from '../../../components/common/Badge';
import { Alert } from '../../../components/common/Alert';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { Pagination } from '../../../components/common/Pagination';
import { Modal } from '../../../components/common/Modal';
import { ApiError } from '../../../api/client';

export const BillingPage: React.FC = () => {
  const currentMonthStr = getCurrentMonthString();
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);

  const [invoicesPage, setInvoicesPage] = useState<Page<Invoice>>({
    content: [],
    page: 0,
    size: 15,
    totalElements: 0,
    totalPages: 0,
  });
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- Calculate Batch State ---
  const [calculating, setCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState<MonthCalculateResponse | null>(null);

  // --- Invoice Detail Modal ---
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // --- Issue Invoice Modal ---
  const [issueInvoiceTarget, setIssueInvoiceTarget] = useState<Invoice | null>(null);
  const [issueDueDate, setIssueDueDate] = useState<string>('');
  const [issuing, setIssuing] = useState(false);

  // --- Reconciliation State ---
  const [reconcileInvoiceTarget, setReconcileInvoiceTarget] = useState<Invoice | null>(null);
  const [previewData, setPreviewData] = useState<ReconciliationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reconcileReason, setReconcileReason] = useState('Сверка начислений после изменения данных');
  const [reconciling, setReconciling] = useState(false);

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    setError(null);
    try {
      const res = await billingApi.getInvoices({
        month: selectedMonth || undefined,
        status: statusFilter || undefined,
        page,
        size: 15,
      });
      setInvoicesPage(res);
    } catch {
      setError('Не удалось загрузить реестр счетов.');
    } finally {
      setLoadingInvoices(false);
    }
  }, [selectedMonth, statusFilter, page]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Run Batch Calculation
  const handleCalculateMonth = async () => {
    if (!window.confirm(`Запустить предварительный расчёт начислений за ${formatMonth(selectedMonth)}?`)) {
      return;
    }
    setCalculating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await billingApi.calculateMonth(selectedMonth);
      setCalcResult(res);
      setSuccess(`Предварительный расчёт за ${formatMonth(selectedMonth)} завершён.`);
      fetchInvoices();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка пакетного расчёта');
      } else {
        setError('Не удалось выполнить расчёт.');
      }
    } finally {
      setCalculating(false);
    }
  };

  // Open Invoice Detail
  const handleOpenDetail = async (inv: Invoice) => {
    setLoadingDetail(true);
    try {
      const full = await billingApi.getInvoice(inv.id);
      setDetailInvoice(full);
    } catch {
      setDetailInvoice(inv);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Open Issue Modal
  const handleOpenIssue = (inv: Invoice) => {
    setIssueInvoiceTarget(inv);
    const defaultDue = getDefaultDueDate(inv.month);
    setIssueDueDate(defaultDue);
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueInvoiceTarget) return;

    setIssuing(true);
    setError(null);
    try {
      await billingApi.issueInvoice(issueInvoiceTarget.id, {
        version: issueInvoiceTarget.version,
        dueDate: issueDueDate || null,
      });
      setIssueInvoiceTarget(null);
      setSuccess(`Счёт для ${issueInvoiceTarget.childName} успешно выставлен.`);
      fetchInvoices();
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.detail || err.title || 'Ошибка выставления счёта');
      }
    } finally {
      setIssuing(false);
    }
  };

  // Open Reconciliation Preview
  const handleOpenReconcile = async (inv: Invoice) => {
    setReconcileInvoiceTarget(inv);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await billingApi.previewReconciliation(inv.id);
      setPreviewData(res);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.detail || err.title || 'Ошибка предварительной сверки');
      }
      setReconcileInvoiceTarget(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileInvoiceTarget || !reconcileReason.trim()) {
      alert('Укажите обязательную причину сверки');
      return;
    }

    setReconciling(true);
    try {
      const res = await billingApi.reconcileInvoice(reconcileInvoiceTarget.id, {
        reason: reconcileReason.trim(),
      });
      setReconcileInvoiceTarget(null);
      setPreviewData(null);
      setSuccess(
        `Сверка проведена. Разница: ${formatSignedMoney(res.difference)}. Корректировка отражена на лицевом счёте.`
      );
      fetchInvoices();
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.detail || err.title || 'Ошибка подтверждения сверки');
      }
    } finally {
      setReconciling(false);
    }
  };

  const requiresExplicitDueDate = selectedMonth ? isPastDayTenOfMonth(selectedMonth) : false;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Расчёты и выставление счетов</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Предварительный расчёт питания, проверка формул, выставление и сверка счетов
          </p>
        </div>

        <div className="page-header-actions">
          <Button
            variant="primary"
            onClick={handleCalculateMonth}
            loading={calculating}
          >
            <Calculator size={16} /> Рассчитать черновики ({formatMonth(selectedMonth)})
          </Button>
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}
      {success && <Alert type="success" className="mb-4">{success}</Alert>}

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
        <div style={{ width: '180px' }}>
          <label className="form-label">Расчётный месяц</label>
          <input
            type="month"
            className="form-input"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setPage(0);
            }}
          />
        </div>

        <div style={{ width: '180px' }}>
          <label className="form-label">Статус счёта</label>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Все статусы</option>
            <option value="DRAFT">Черновик (DRAFT)</option>
            <option value="ISSUED">Выставлен (ISSUED)</option>
          </select>
        </div>

        <Button variant="secondary" onClick={fetchInvoices}>
          <Filter size={15} /> Обновить реестр
        </Button>
      </div>

      {/* Invoices Table */}
      {loadingInvoices ? (
        <Loading text="Загрузка счетов..." />
      ) : invoicesPage.content.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} style={{ color: 'var(--navy-300)' }} />}
          title="Счета за этот месяц не найдены"
          description="Нажмите кнопку «Рассчитать черновики за месяц», чтобы система автоматически сформировала предварительные начисления для всех активных детей."
          action={
            <Button variant="primary" size="sm" onClick={handleCalculateMonth} loading={calculating}>
              <Calculator size={14} /> Запустить расчёт
            </Button>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Ребёнок</th>
                <th>Месяц</th>
                <th>Сумма начисления</th>
                <th>Срок оплаты</th>
                <th>Статус</th>
                <th>Сверка</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {invoicesPage.content.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--navy-900)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'left',
                        textDecoration: 'underline',
                      }}
                      onClick={() => handleOpenDetail(inv)}
                    >
                      {inv.childName}
                    </button>
                  </td>
                  <td>{formatMonth(inv.month)}</td>
                  <td className="amount" style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
                    {formatMoney(inv.amount)}
                  </td>
                  <td>{formatDate(inv.dueDate)}</td>
                  <td>
                    {inv.status === 'ISSUED' ? (
                      <Badge variant="teal">Выставлен</Badge>
                    ) : (
                      <Badge variant="amber">Черновик</Badge>
                    )}
                  </td>
                  <td>
                    {inv.needsReconciliation ? (
                      <Badge variant="red">
                        <AlertTriangle size={12} /> Требуется сверка
                      </Badge>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Актуален</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenDetail(inv)}
                        title="Просмотр детализации формулы"
                      >
                        <FileText size={13} /> Детали
                      </button>

                      {inv.status === 'DRAFT' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenIssue(inv)}
                          title="Выставить счёт и зафиксировать начисление"
                        >
                          <Send size={13} /> Выставить
                        </button>
                      )}

                      {inv.status === 'ISSUED' && (
                        <button
                          type="button"
                          className={`btn btn-sm ${inv.needsReconciliation ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={() => handleOpenReconcile(inv)}
                          title="Пересчитать и при необходимости сформировать корректировку"
                        >
                          <RefreshCw size={13} /> Сверка
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={invoicesPage.page}
            totalPages={invoicesPage.totalPages}
            totalElements={invoicesPage.totalElements}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Batch Calculation Result Modal */}
      <Modal
        isOpen={!!calcResult}
        onClose={() => setCalcResult(null)}
        title={`Результаты расчёта за ${calcResult ? formatMonth(calcResult.month) : ''}`}
        maxWidth="680px"
      >
        <div>
          <Alert type="info" className="mb-4">
            Обработано детей: <strong>{calcResult?.results.length}</strong>. Каждый ребёнок обработан в отдельной транзакции.
          </Alert>

          <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Ребёнок</th>
                  <th>Статус</th>
                  <th>Сообщение</th>
                </tr>
              </thead>
              <tbody>
                {calcResult?.results.map((res, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{res.childName}</td>
                    <td>
                      {res.status === 'CALCULATED' && <Badge variant="green">Рассчитан</Badge>}
                      {res.status === 'ALREADY_ISSUED' && <Badge variant="teal">Уже выставлен</Badge>}
                      {res.status === 'ERROR' && <Badge variant="red">Ошибка</Badge>}
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{res.message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <Button variant="primary" onClick={() => setCalcResult(null)}>
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invoice Details & Calculation Breakdown Modal */}
      <Modal
        isOpen={!!detailInvoice}
        onClose={() => setDetailInvoice(null)}
        title={`Детализация счёта: ${detailInvoice?.childName} (${formatMonth(detailInvoice?.month)})`}
        maxWidth="720px"
      >
        {loadingDetail ? (
          <Loading text="Загрузка полной детализации счёта..." />
        ) : detailInvoice ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Статус: </span>
                {detailInvoice.status === 'ISSUED' ? (
                  <Badge variant="teal">Выставлен ({formatDateTime(detailInvoice.issuedAt)})</Badge>
                ) : (
                  <Badge variant="amber">Черновик</Badge>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Итого к оплате: </span>
                <span className="amount" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                  {formatMoney(detailInvoice.amount)}
                </span>
              </div>
            </div>

            {detailInvoice.calculation ? (
              <div>
                <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem' }}>Обоснование начисления</h4>
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                  }}
                >
                  {detailInvoice.calculation.explanation || 'Расчёт проведён по стандартному алгоритму'}
                </div>

                <div className="metrics-grid" style={{ marginBottom: '1rem' }}>
                  <div className="metric-card" style={{ padding: '0.75rem 1rem' }}>
                    <div className="metric-title">Рабочих дней в месяце (W)</div>
                    <div className="metric-value" style={{ fontSize: '1.125rem' }}>
                      {detailInvoice.calculation.workingDays}
                    </div>
                  </div>
                  <div className="metric-card" style={{ padding: '0.75rem 1rem' }}>
                    <div className="metric-title">Оплачиваемых дней (P)</div>
                    <div className="metric-value" style={{ fontSize: '1.125rem', color: 'var(--teal-700)' }}>
                      {detailInvoice.calculation.payableDays}
                    </div>
                  </div>
                </div>

                {/* Excluded days */}
                <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
                  Исключённые из оплаты дни ({detailInvoice.calculation.excludedDays?.length || 0})
                </h4>
                {!detailInvoice.calculation.excludedDays || detailInvoice.calculation.excludedDays.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Нет исключённых дней (ребёнок посещал весь месяц).
                  </p>
                ) : (
                  <div className="table-container" style={{ marginBottom: '1rem', maxHeight: '180px', overflowY: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Дата</th>
                          <th>Причины исключения из оплаты</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailInvoice.calculation.excludedDays.map((ex, idx) => (
                          <tr key={idx}>
                            <td>{formatDate(ex.date)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                {ex.reasons.map((r, ri) => (
                                  <Badge key={ri} variant={r === 'ILLNESS' ? 'amber' : 'red'}>
                                    {r === 'ILLNESS' ? 'Подтверждённая болезнь' : r === 'CLOSED' ? 'Закрытие сада' : 'Вне периода зачисления'}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tariff periods */}
                {detailInvoice.calculation.tariffPeriods && detailInvoice.calculation.tariffPeriods.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem' }}>Тарифные периоды</h4>
                    <div className="table-container" style={{ marginBottom: '1rem' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Период</th>
                            <th>Ежемесячный тариф</th>
                            <th>Оплачиваемых дней</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailInvoice.calculation.tariffPeriods.map((tp, tpi) => (
                            <tr key={tpi}>
                              <td>{formatDate(tp.from)} — {formatDate(tp.to)}</td>
                              <td className="amount">{formatMoney(tp.monthlyAmount)}</td>
                              <td>{tp.payableDays}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Детализация расчёта недоступна.</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <Button variant="secondary" onClick={() => setDetailInvoice(null)}>
                Закрыть
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Issue Invoice Modal */}
      <Modal
        isOpen={!!issueInvoiceTarget}
        onClose={() => setIssueInvoiceTarget(null)}
        title={`Выставление счёта: ${issueInvoiceTarget?.childName}`}
      >
        <form onSubmit={handleIssueSubmit}>
          <Alert type="info" className="mb-4">
            При выставлении счёта фиксируется расчётный снимок, и на лицевой счёт ребёнка вносится финансовое начисление на сумму{' '}
            <strong>{formatMoney(issueInvoiceTarget?.amount)}</strong>.
          </Alert>

          {requiresExplicitDueDate && (
            <Alert type="warning" className="mb-4">
              Поскольку 10-е число расчётного месяца уже прошло, необходимо явно указать срок оплаты счёта.
            </Alert>
          )}

          <Input
            label="Срок оплаты (до включительно)"
            type="date"
            value={issueDueDate}
            onChange={(e) => setIssueDueDate(e.target.value)}
            required
            hint="По умолчанию 10-е число расчётного месяца."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIssueInvoiceTarget(null)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={issuing}>
              Выставить счёт
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reconciliation Preview & Confirm Modal */}
      <Modal
        isOpen={!!reconcileInvoiceTarget}
        onClose={() => {
          setReconcileInvoiceTarget(null);
          setPreviewData(null);
        }}
        title={`Сверка начислений: ${reconcileInvoiceTarget?.childName}`}
        maxWidth="680px"
      >
        <div>
          {previewLoading ? (
            <Loading text="Выполняется предварительный пересчёт счёта под блокировкой..." />
          ) : previewData ? (
            <form onSubmit={handleConfirmReconcile}>
              <div className="metrics-grid" style={{ marginBottom: '1rem' }}>
                <div className="metric-card" style={{ padding: '0.75rem 1rem' }}>
                  <div className="metric-title">Прежняя сумма счёта</div>
                  <div className="metric-value" style={{ fontSize: '1.125rem' }}>
                    {formatMoney(previewData.previousAmount)}
                  </div>
                </div>

                <div className="metric-card" style={{ padding: '0.75rem 1rem' }}>
                  <div className="metric-title">Новая правильная сумма</div>
                  <div className="metric-value" style={{ fontSize: '1.125rem', color: 'var(--teal-700)' }}>
                    {formatMoney(previewData.newAmount)}
                  </div>
                </div>

                <div className="metric-card" style={{ padding: '0.75rem 1rem' }}>
                  <div className="metric-title">Разница к проводке</div>
                  <div
                    className="metric-value"
                    style={{
                      fontSize: '1.125rem',
                      color:
                        previewData.difference > 0
                          ? 'var(--red-600)'
                          : previewData.difference < 0
                          ? 'var(--teal-700)'
                          : 'var(--navy-900)',
                    }}
                  >
                    {formatSignedMoney(previewData.difference)}
                  </div>
                  <div className="metric-sub" style={{ fontSize: '0.75rem' }}>
                    {previewData.difference < 0 ? 'Вычет (уменьшит долг/даст аванс)' : previewData.difference > 0 ? 'Доначисление (увеличит долг)' : 'Суммы совпадают'}
                  </div>
                </div>
              </div>

              {previewData.difference === 0 ? (
                <Alert type="success" className="mb-4">
                  Данные счёта полностью актуальны. Дополнительной финансовой корректировки не требуется.
                </Alert>
              ) : (
                <Alert type="warning" className="mb-4">
                  Подтверждение создаст корректировочную операцию в главной книге на сумму{' '}
                  <strong>{formatSignedMoney(previewData.difference)}</strong>.
                </Alert>
              )}

              <Input
                label="Обязательная причина сверки"
                value={reconcileReason}
                onChange={(e) => setReconcileReason(e.target.value)}
                required
                placeholder="Например: Позднее подтверждение справки о болезни"
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setReconcileInvoiceTarget(null);
                    setPreviewData(null);
                  }}
                >
                  Отмена
                </Button>
                <Button type="submit" variant="primary" loading={reconciling}>
                  Подтвердить сверку
                </Button>
              </div>
            </form>
          ) : (
            <Alert type="error">Не удалось получить данные сверки.</Alert>
          )}
        </div>
      </Modal>
    </div>
  );
};
