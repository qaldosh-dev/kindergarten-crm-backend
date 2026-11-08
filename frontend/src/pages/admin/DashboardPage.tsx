import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  CreditCard,
  DollarSign,
  FileText,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { reportsApi } from '../../api/reports';
import { BillingReport } from '../../types/domain';
import { getCurrentMonthString } from '../../utils/dates';
import { formatMoney, formatMonth } from '../../utils/formatters';
import { Alert } from '../../components/common/Alert';
import { Loading } from '../../components/common/Loading';
import { Badge } from '../../components/common/Badge';

export const DashboardPage: React.FC = () => {
  const currentMonth = getCurrentMonthString();
  const [report, setReport] = useState<BillingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await reportsApi.getBillingReport(currentMonth);
        if (mounted) setReport(data);
      } catch {
        if (mounted) {
          setError('Не удалось загрузить сводные финансовые показатели за текущий месяц.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchReport();
    return () => {
      mounted = false;
    };
  }, [currentMonth]);

  const needingReconciliation = report?.rows?.filter((r) => r.needsReconciliation) || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Обзор управления</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Сводка и ключевые показатели детского сада за {formatMonth(currentMonth)}
          </p>
        </div>
      </div>

      {error && <Alert type="warning" className="mb-4">{error}</Alert>}

      {/* Metrics Grid */}
      {loading ? (
        <Loading text="Загрузка показателей месяца..." />
      ) : report ? (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div>
                <div className="metric-title">Начислено за месяц</div>
                <div className="metric-value">{formatMoney(report.totalCharged)}</div>
              </div>
              <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--teal-700)' }}>
                <TrendingUp size={14} />
                <span>Период: {formatMonth(currentMonth)}</span>
              </div>
            </div>

            <div className="metric-card">
              <div>
                <div className="metric-title">Поступило платежей</div>
                <div className="metric-value" style={{ color: 'var(--green-700)' }}>
                  {formatMoney(report.totalPaid)}
                </div>
              </div>
              <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--green-700)' }}>
                <DollarSign size={14} />
                <span>Фактически оплачено</span>
              </div>
            </div>

            <div className="metric-card">
              <div>
                <div className="metric-title">Общий долг родителей</div>
                <div className="metric-value" style={{ color: 'var(--red-600)' }}>
                  {formatMoney(report.totalDebt)}
                </div>
              </div>
              <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--red-600)' }}>
                <TrendingDown size={14} />
                <span>Текущая задолженность</span>
              </div>
            </div>

            <div className="metric-card">
              <div>
                <div className="metric-title">Общая переплата</div>
                <div className="metric-value" style={{ color: 'var(--teal-700)' }}>
                  {formatMoney(report.totalCredit)}
                </div>
              </div>
              <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--teal-700)' }}>
                <DollarSign size={14} />
                <span>Авансы родителей</span>
              </div>
            </div>
          </div>

          {/* Children needing reconciliation banner/card */}
          {needingReconciliation.length > 0 && (
            <div
              className="card"
              style={{
                borderColor: 'var(--amber-300)',
                backgroundColor: 'var(--amber-50)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <AlertTriangle size={22} style={{ color: 'var(--amber-700)' }} />
                <h3 style={{ color: 'var(--amber-900)' }}>
                  Требуется сверка начислений ({needingReconciliation.length})
                </h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--amber-800)', marginBottom: '1rem' }}>
                После выставления счетов были изменены справки о болезни, даты зачисления или календарь.
                Необходимо провести сверку и сформировать корректировку.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {needingReconciliation.slice(0, 5).map((child) => (
                  <Badge key={child.childId} variant="amber">
                    {child.childName} ({child.groupName})
                  </Badge>
                ))}
                {needingReconciliation.length > 5 && (
                  <Badge variant="amber">и еще {needingReconciliation.length - 5} детей</Badge>
                )}
              </div>
              <div style={{ marginTop: '1rem' }}>
                <Link to="/admin/billing" className="btn btn-primary btn-sm">
                  Перейти в раздел расчётов и сверки
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Quick Navigation Cards */}
      <h2 style={{ fontSize: '1.125rem', margin: '1.5rem 0 1rem' }}>Быстрый переход</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        <Link to="/admin/children" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--teal-50)', color: 'var(--teal-600)' }}>
              <Users size={22} />
            </div>
            <h3 style={{ fontSize: '1rem' }}>Дети и группы</h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Карточки детей, контакты родителей, история переводов, лицевые счета.
          </p>
        </Link>

        <Link to="/admin/attendance" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--teal-50)', color: 'var(--teal-600)' }}>
              <CheckSquare size={22} />
            </div>
            <h3 style={{ fontSize: '1rem' }}>Исправление посещаемости</h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Просмотр и корректировка отметок детей за любую дату с фиксацией причины.
          </p>
        </Link>

        <Link to="/admin/billing" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--teal-50)', color: 'var(--teal-600)' }}>
              <FileText size={22} />
            </div>
            <h3 style={{ fontSize: '1rem' }}>Расчёты и выставление счетов</h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Пакетный предварительный расчёт, детализация формул, выставление и сверка.
          </p>
        </Link>

        <Link to="/admin/payments" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--teal-50)', color: 'var(--teal-600)' }}>
              <CreditCard size={22} />
            </div>
            <h3 style={{ fontSize: '1rem' }}>Регистрация платежей</h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Внесение оплат (наличные/перевод), отмена с фиксацией причины, возвраты.
          </p>
        </Link>
      </div>
    </div>
  );
};
