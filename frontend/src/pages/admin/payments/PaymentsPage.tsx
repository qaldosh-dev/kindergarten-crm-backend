import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Ban,
  CheckCircle,
  CreditCard,
  Filter,
  Plus,
} from 'lucide-react';
import { paymentsApi } from '../../../api/payments';
import { childrenApi } from '../../../api/children';
import { Child, Payment, PaymentMethod } from '../../../types/domain';
import { Page } from '../../../types/api';
import {
  formatDate,
  formatMoney,
  formatPaymentMethod,
} from '../../../utils/formatters';
import { getCurrentMonthString, getTodayDateString } from '../../../utils/dates';
import { IdempotencyTracker } from '../../../utils/idempotency';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Badge } from '../../../components/common/Badge';
import { Alert } from '../../../components/common/Alert';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { Pagination } from '../../../components/common/Pagination';
import { Modal } from '../../../components/common/Modal';
import { ApiError } from '../../../api/client';

export const PaymentsPage: React.FC = () => {
  const currentMonthStr = getCurrentMonthString();
  const [filterMonth, setFilterMonth] = useState<string>(currentMonthStr);
  const [filterChildId, setFilterChildId] = useState<string>('');
  const [page, setPage] = useState(0);

  const [paymentsPage, setPaymentsPage] = useState<Page<Payment>>({
    content: [],
    page: 0,
    size: 15,
    totalElements: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Children for dropdown
  const [childrenList, setChildrenList] = useState<Child[]>([]);

  // Register Payment Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regChildId, setRegChildId] = useState<number | ''>('');
  const [regAmount, setRegAmount] = useState<number | ''>('');
  const [regPaidOn, setRegPaidOn] = useState(getTodayDateString());
  const [regMethod, setRegMethod] = useState<PaymentMethod>('TRANSFER');
  const [regComment, setRegComment] = useState('');
  const [registering, setRegistering] = useState(false);

  const paymentTracker = useMemo(() => new IdempotencyTracker(), []);

  // Cancel Payment Modal
  const [cancelTarget, setCancelTarget] = useState<Payment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Load children list
  useEffect(() => {
    childrenApi.getChildren({ size: 100 })
      .then((res) => {
        setChildrenList(res.content || []);
        if (res.content?.length > 0 && regChildId === '') {
          setRegChildId(res.content[0].id);
        }
      })
      .catch(() => {});
  }, [regChildId]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await paymentsApi.getPayments({
        month: filterMonth || undefined,
        childId: filterChildId ? Number(filterChildId) : undefined,
        page,
        size: 15,
      });
      setPaymentsPage(res);
    } catch {
      setError('Не удалось загрузить реестр платежей.');
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterChildId, page]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Handle Register Payment
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regChildId || regAmount === '' || Number(regAmount) <= 0) {
      alert('Укажите ребёнка и положительную сумму платежа');
      return;
    }

    setRegistering(true);
    setError(null);

    const payload = {
      childId: Number(regChildId),
      amount: Number(regAmount),
      paidOn: regPaidOn,
      method: regMethod,
      comment: regComment.trim() || undefined,
    };
    const idempotencyKey = paymentTracker.getKey(payload);

    try {
      await paymentsApi.createPayment(payload, idempotencyKey);
      paymentTracker.reset();
      setIsRegisterOpen(false);
      setSuccess('Платёж успешно зарегистрирован и распределён в счёт погашения начислений.');
      // Reset form
      setRegAmount('');
      setRegComment('');
      fetchPayments();
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.detail || err.title || 'Ошибка регистрации платежа');
      }
    } finally {
      setRegistering(false);
    }
  };

  // Handle Cancel Payment
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget || !cancelReason.trim()) {
      alert('Укажите обязательную причину отмены');
      return;
    }

    setCancelling(true);
    try {
      await paymentsApi.cancelPayment(cancelTarget.id, { reason: cancelReason.trim() });
      setCancelTarget(null);
      setCancelReason('');
      setSuccess('Платёж отменён. Распределение сумм автоматически пересчитано.');
      fetchPayments();
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.detail || err.title || 'Ошибка отмены платежа');
      }
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Реестр родительских оплат</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Регистрация поступлений, история платежей, отмена и автоматическое распределение
          </p>
        </div>

        <div className="page-header-actions">
          <Button
            variant="primary"
            onClick={() => {
              setRegAmount('');
              setRegPaidOn(getTodayDateString());
              setRegComment('');
              setIsRegisterOpen(true);
            }}
          >
            <Plus size={16} /> Внести платёж
          </Button>
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}
      {success && <Alert type="success" className="mb-4">{success}</Alert>}

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
        <div style={{ width: '180px' }}>
          <label className="form-label">Месяц даты оплаты</label>
          <input
            type="month"
            className="form-input"
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              setPage(0);
            }}
          />
        </div>

        <div style={{ flex: '1 1 220px' }}>
          <label className="form-label">Фильтр по ребёнку</label>
          <select
            className="form-select"
            value={filterChildId}
            onChange={(e) => {
              setFilterChildId(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Все дети</option>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </div>

        <Button variant="secondary" onClick={fetchPayments}>
          <Filter size={15} /> Применить фильтр
        </Button>
      </div>

      {/* Payments Table */}
      {loading ? (
        <Loading text="Загрузка списка платежей..." />
      ) : paymentsPage.content.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={40} style={{ color: 'var(--navy-300)' }} />}
          title="Платежи не найдены"
          description="По заданным фильтрам платежей не обнаружено."
          action={
            <Button variant="primary" size="sm" onClick={() => setIsRegisterOpen(true)}>
              <Plus size={14} /> Внести платёж
            </Button>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Ребёнок</th>
                <th>Сумма</th>
                <th>Дата оплаты</th>
                <th>Способ оплаты</th>
                <th>Комментарий</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {paymentsPage.content.map((p) => {
                const isCancelled = !!p.cancelledAt;
                return (
                  <tr
                    key={p.id}
                    style={{
                      opacity: isCancelled ? 0.65 : 1,
                      backgroundColor: isCancelled ? 'rgba(254, 242, 242, 0.4)' : undefined,
                    }}
                  >
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{p.id}</td>
                    <td style={{ fontWeight: 600 }}>{p.childName || `Ребёнок #${p.childId}`}</td>
                    <td
                      className="amount"
                      style={{
                        fontWeight: 700,
                        color: isCancelled ? 'var(--text-muted)' : 'var(--green-700)',
                        textDecoration: isCancelled ? 'line-through' : 'none',
                      }}
                    >
                      {formatMoney(p.amount)}
                    </td>
                    <td>{formatDate(p.paidOn)}</td>
                    <td>
                      <Badge variant={p.method === 'TRANSFER' ? 'teal' : 'gray'}>
                        {formatPaymentMethod(p.method)}
                      </Badge>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{p.comment || '—'}</td>
                    <td>
                      {isCancelled ? (
                        <div>
                          <Badge variant="red">
                            <Ban size={12} /> Отменён
                          </Badge>
                          <div style={{ fontSize: '0.75rem', color: 'var(--red-700)', marginTop: '2px' }}>
                            {p.cancellationReason}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="green">
                          <CheckCircle size={12} /> Зачислен
                        </Badge>
                      )}
                    </td>
                    <td>
                      {!isCancelled && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--red-600)' }}
                          onClick={() => {
                            setCancelTarget(p);
                            setCancelReason('');
                          }}
                        >
                          Отменить
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination
            page={paymentsPage.page}
            totalPages={paymentsPage.totalPages}
            totalElements={paymentsPage.totalElements}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Register Payment Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Регистрация поступившей оплаты"
      >
        <form onSubmit={handleRegisterSubmit}>
          <Alert type="info" className="mb-4">
            Платёж погашает старейшие выставленные начисления ребёнка. Остаток суммы автоматически становится авансом.
          </Alert>

          <div className="form-group">
            <label className="form-label">Ребёнок</label>
            <select
              className="form-select"
              value={regChildId}
              onChange={(e) => setRegChildId(Number(e.target.value))}
              required
            >
              {childrenList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Сумма оплаты (₸)"
            type="number"
            min="1"
            value={regAmount}
            onChange={(e) => setRegAmount(e.target.value === '' ? '' : Number(e.target.value))}
            required
            placeholder="Например: 50000"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input
              label="Дата фактической оплаты"
              type="date"
              value={regPaidOn}
              onChange={(e) => setRegPaidOn(e.target.value)}
              required
            />

            <div className="form-group">
              <label className="form-label">Способ оплаты</label>
              <select
                className="form-select"
                value={regMethod}
                onChange={(e) => setRegMethod(e.target.value as PaymentMethod)}
              >
                <option value="TRANSFER">Безналичный перевод</option>
                <option value="CASH">Наличные</option>
              </select>
            </div>
          </div>

          <Input
            label="Комментарий к платежу"
            value={regComment}
            onChange={(e) => setRegComment(e.target.value)}
            placeholder="Номер чека / квитанции Kaspi"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsRegisterOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={registering}>
              Зарегистрировать платёж
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Payment Modal */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={`Отмена платежа #${cancelTarget?.id} (${formatMoney(cancelTarget?.amount)})`}
      >
        <form onSubmit={handleCancelSubmit}>
          <Alert type="warning" className="mb-4">
            Отмена платежа аннулирует его влияние на погашение счетов. Погашенные ранее счета вновь станут неоплаченными.
          </Alert>

          <Input
            label="Обязательная причина отмены платежа"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
            placeholder="Например: Ошибочное внесение / возврат банком"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setCancelTarget(null)}>
              Отмена
            </Button>
            <Button type="submit" variant="danger" loading={cancelling}>
              Отменить платёж
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
