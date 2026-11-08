import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { reportsApi } from '../../../api/reports';
import { BillingReport } from '../../../types/domain';
import {
  formatMoney,
  formatMonth,
  formatSignedMoney,
} from '../../../utils/formatters';
import { getCurrentMonthString } from '../../../utils/dates';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Alert } from '../../../components/common/Alert';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { ApiError } from '../../../api/client';

export const ReportsPage: React.FC = () => {
  const currentMonthStr = getCurrentMonthString();
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [report, setReport] = useState<BillingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getBillingReport(selectedMonth);
      setReport(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка загрузки финансового отчёта');
      } else {
        setError('Не удалось загрузить отчёт за выбранный период.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDownloadCsv = async () => {
    setDownloading(true);
    try {
      await reportsApi.downloadBillingCsv(selectedMonth);
    } catch {
      alert('Ошибка при выгрузке отчёта в CSV.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Сводный финансовый отчёт</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Начисления, поступившие оплаты, возвраты, задолженности и переплаты по детям за {formatMonth(selectedMonth)}
          </p>
        </div>

        <div className="page-header-actions">
          <Button
            variant="secondary"
            onClick={handleDownloadCsv}
            loading={downloading}
            disabled={loading || !report}
          >
            <Download size={16} /> Экспорт в CSV
          </Button>
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {/* Control bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label className="form-label" style={{ marginBottom: '0.25rem' }}>Отчётный месяц</label>
          <input
            type="month"
            className="form-input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
          <Button variant="secondary" size="sm" onClick={fetchReport}>
            <RefreshCw size={14} /> Обновить данные
          </Button>
        </div>
      </div>

      {loading ? (
        <Loading text="Формирование отчёта..." />
      ) : !report ? (
        <EmptyState title="Отчёт недоступен" description="Данные за этот период отсутствуют." />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div>
                <div className="metric-title">Начислено за месяц</div>
                <div className="metric-value">{formatMoney(report.totalCharged)}</div>
              </div>
              <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--teal-700)' }}>
                <TrendingUp size={14} /> Сумма выставленных счетов
              </div>
            </div>

            <div className="metric-card">
              <div>
                <div className="metric-title">Поступило оплат</div>
                <div className="metric-value" style={{ color: 'var(--green-700)' }}>
                  {formatMoney(report.totalPaid)}
                </div>
              </div>
              <div className="metric-sub">Фактически оплачено родителями</div>
            </div>

            <div className="metric-card">
              <div>
                <div className="metric-title">Возвраты родителю</div>
                <div className="metric-value" style={{ color: 'var(--amber-700)' }}>
                  {formatMoney(report.totalRefunded)}
                </div>
              </div>
              <div className="metric-sub">Выплачено возвратов переплаты</div>
            </div>

            <div className="metric-card">
              <div>
                <div className="metric-title">Общий долг родителей</div>
                <div className="metric-value" style={{ color: 'var(--red-600)' }}>
                  {formatMoney(report.totalDebt)}
                </div>
              </div>
              <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--red-600)' }}>
                <TrendingDown size={14} /> Текущая задолженность
              </div>
            </div>

            <div className="metric-card">
              <div>
                <div className="metric-title">Общая переплата (авансы)</div>
                <div className="metric-value" style={{ color: 'var(--teal-700)' }}>
                  {formatMoney(report.totalCredit)}
                </div>
              </div>
              <div className="metric-sub">Авансовые остатки на счетах</div>
            </div>
          </div>

          {/* Details Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem' }}>Детализация по воспитанникам ({report.rows?.length || 0})</h3>
            </div>

            {report.rows?.length === 0 ? (
              <EmptyState title="Строк нет" description="Нет данных по детям за выбранный месяц." />
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>ФИО ребёнка</th>
                      <th>Группа</th>
                      <th>Начислено (₸)</th>
                      <th>Оплачено (₸)</th>
                      <th>Возврат (₸)</th>
                      <th>Баланс счёта</th>
                      <th>Задолженность</th>
                      <th>Переплата</th>
                      <th>Сверка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.childId}>
                        <td style={{ fontWeight: 600 }}>{row.childName}</td>
                        <td>{row.groupName}</td>
                        <td className="amount" style={{ fontWeight: 600 }}>
                          {formatMoney(row.charged)}
                        </td>
                        <td className="amount" style={{ color: 'var(--green-700)' }}>
                          {formatMoney(row.paid)}
                        </td>
                        <td className="amount" style={{ color: 'var(--amber-700)' }}>
                          {formatMoney(row.refunded)}
                        </td>
                        <td
                          className="amount"
                          style={{
                            fontWeight: 600,
                            color:
                              row.balance > 0
                                ? 'var(--red-600)'
                                : row.balance < 0
                                ? 'var(--teal-700)'
                                : 'var(--navy-900)',
                          }}
                        >
                          {formatSignedMoney(row.balance)}
                        </td>
                        <td className="amount" style={{ color: 'var(--red-600)' }}>
                          {formatMoney(row.debt)}
                        </td>
                        <td className="amount" style={{ color: 'var(--teal-700)' }}>
                          {formatMoney(row.credit)}
                        </td>
                        <td>
                          {row.needsReconciliation ? (
                            <Badge variant="red">
                              <AlertTriangle size={12} /> Требуется
                            </Badge>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>В норме</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
