import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  CreditCard,
  DollarSign,
  FileText,
  History,
  Plus,
  RotateCcw,
  Save,
  Tag,
  User,
  UserX,
  Users,
} from 'lucide-react';
import { childrenApi } from '../../../api/children';
import { groupsApi } from '../../../api/groups';
import {
  Account,
  Child,
  ChildContact,
  ChildGroupMembership,
  Group,
  IllnessCertificate,
  PriceOverride,
} from '../../../types/domain';
import { Page } from '../../../types/api';
import {
  formatAccountEntryType,
  formatDate,
  formatDateTime,
  formatMoney,
  formatSignedMoney,
} from '../../../utils/formatters';
import { getTodayDateString } from '../../../utils/dates';
import { IdempotencyTracker } from '../../../utils/idempotency';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Textarea } from '../../../components/common/Textarea';
import { Select } from '../../../components/common/Select';
import { Badge } from '../../../components/common/Badge';
import { EnrollmentBadge } from '../../../components/common/EnrollmentBadge';
import { Modal } from '../../../components/common/Modal';
import { Alert } from '../../../components/common/Alert';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { ApiError } from '../../../api/client';

export const ChildDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const childId = Number(id);

  const [activeTab, setActiveTab] = useState<
    'info' | 'memberships' | 'account' | 'illness' | 'prices'
  >('info');

  const [child, setChild] = useState<Child | null>(null);
  const [loadingChild, setLoadingChild] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [groups, setGroups] = useState<Group[]>([]);

  // --- Sub-resource states ---
  const [memberships, setMemberships] = useState<ChildGroupMembership[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [certificates, setCertificates] = useState<Page<IllnessCertificate> | null>(null);
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([]);

  // Sub-resource loading
  const [loadingData, setLoadingData] = useState(false);

  // --- Edit Child Form State ---
  const [editFullName, setEditFullName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editAdmissionDate, setEditAdmissionDate] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editContacts, setEditContacts] = useState<ChildContact[]>([]);
  const [savingChild, setSavingChild] = useState(false);

  // --- Withdrawal Modal ---
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawalDateInput, setWithdrawalDateInput] = useState(getTodayDateString());
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);

  // --- Transfer Modal ---
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferGroupId, setTransferGroupId] = useState<number | ''>('');
  const [transferValidFrom, setTransferValidFrom] = useState(getTodayDateString());
  const [transferLoading, setTransferLoading] = useState(false);

  // --- Membership Correction Modal ---
  const [editMembership, setEditMembership] = useState<ChildGroupMembership | null>(null);
  const [editMembershipValidFrom, setEditMembershipValidFrom] = useState('');
  const [editMembershipValidTo, setEditMembershipValidTo] = useState('');
  const [editMembershipGroupId, setEditMembershipGroupId] = useState<number | ''>('');
  const [editMembershipReason, setEditMembershipReason] = useState('');
  const [editMembershipLoading, setEditMembershipLoading] = useState(false);

  // --- Financial Modals (with Idempotency) ---
  const openingTracker = useMemo(() => new IdempotencyTracker(), []);
  const adjustmentTracker = useMemo(() => new IdempotencyTracker(), []);
  const refundTracker = useMemo(() => new IdempotencyTracker(), []);

  // Opening Balance Modal
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<number | ''>('');
  const [openingReason, setOpeningReason] = useState('Перенос задолженности / остатка');
  const [openingLoading, setOpeningLoading] = useState(false);

  // Adjustment Modal
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number | ''>('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentInvoiceId, setAdjustmentInvoiceId] = useState<string>('');
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);

  // Refund Modal
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number | ''>('');
  const [refundPaidOn, setRefundPaidOn] = useState(getTodayDateString());
  const [refundReason, setRefundReason] = useState('Возврат переплаты родителю');
  const [refundLoading, setRefundLoading] = useState(false);

  // --- Illness Certificate Modal ---
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certDateFrom, setCertDateFrom] = useState(getTodayDateString());
  const [certDateTo, setCertDateTo] = useState(getTodayDateString());
  const [certReceivedOn, setCertReceivedOn] = useState(getTodayDateString());
  const [certLateReason, setCertLateReason] = useState('');
  const [certConflictDates, setCertConflictDates] = useState<string[] | null>(null);
  const [certLoading, setCertLoading] = useState(false);

  // Revoke cert modal
  const [revokeCertId, setRevokeCertId] = useState<number | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  // --- Price Override Modal ---
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [priceAmount, setPriceAmount] = useState<number | ''>('');
  const [priceValidFrom, setPriceValidFrom] = useState(getTodayDateString());
  const [priceValidTo, setPriceValidTo] = useState('');
  const [priceReason, setPriceReason] = useState('');
  const [priceVersion, setPriceVersion] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(false);

  // Fetch Child Details
  const fetchChild = useCallback(async () => {
    if (!childId) return;
    setLoadingChild(true);
    setError(null);
    try {
      const data = await childrenApi.getChild(childId);
      setChild(data);
      setEditFullName(data.fullName);
      setEditBirthDate(data.birthDate);
      setEditAdmissionDate(data.admissionDate);
      setEditComment(data.comment || '');
      setEditContacts(data.contacts || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка загрузки карточки ребёнка');
      } else {
        setError('Не удалось загрузить данные ребёнка.');
      }
    } finally {
      setLoadingChild(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchChild();
    groupsApi.getGroups({ size: 100 })
      .then((res) => setGroups(res.content || []))
      .catch(() => {});
  }, [fetchChild]);

  // Load Sub-resource when tab changes
  useEffect(() => {
    if (!childId) return;
    const loadTab = async () => {
      setLoadingData(true);
      try {
        if (activeTab === 'memberships') {
          const res = await childrenApi.getGroupMemberships(childId);
          setMemberships(res);
        } else if (activeTab === 'account') {
          const res = await childrenApi.getChildAccount(childId);
          setAccount(res);
        } else if (activeTab === 'illness') {
          const res = await childrenApi.getIllnessCertificates(childId);
          setCertificates(res);
        } else if (activeTab === 'prices') {
          const res = await childrenApi.getPriceOverrides(childId);
          setPriceOverrides(res);
        }
      } catch {
        // subresource error
      } finally {
        setLoadingData(false);
      }
    };
    loadTab();
  }, [childId, activeTab]);

  // --- Handlers: Edit Child ---
  const handleSaveChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child) return;
    setSavingChild(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await childrenApi.updateChild(child.id, {
        fullName: editFullName.trim(),
        birthDate: editBirthDate,
        admissionDate: editAdmissionDate,
        comment: editComment.trim(),
        contacts: editContacts.filter((c) => c.representativeName.trim() || c.phone.trim()),
        version: child.version,
      });
      setChild(updated);
      setSuccess('Данные ребёнка успешно обновлены');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка при сохранении карточки ребёнка');
      } else {
        setError('Не удалось сохранить изменения.');
      }
    } finally {
      setSavingChild(false);
    }
  };

  // Contacts handlers
  const handleAddContact = () => {
    setEditContacts((prev) => [
      ...prev,
      { representativeName: '', phone: '', relation: 'PARENT', comment: '' },
    ]);
  };

  const handleRemoveContact = (index: number) => {
    setEditContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContactChange = (index: number, field: keyof ChildContact, value: string) => {
    setEditContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  // --- Handlers: Withdrawal & Reopen ---
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child) return;
    setWithdrawalLoading(true);
    setError(null);
    try {
      const updated = await childrenApi.updateWithdrawal(child.id, {
        withdrawalDate: withdrawalDateInput,
        version: child.version,
      });
      setChild(updated);
      setIsWithdrawModalOpen(false);
      setSuccess(`Дата выбытия сохранена: ${formatDate(withdrawalDateInput)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка оформления выбытия');
      }
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const handleReopenAdmission = async () => {
    if (!child || !window.confirm('Отменить дату выбытия ребёнка?')) return;
    setWithdrawalLoading(true);
    setError(null);
    try {
      const updated = await childrenApi.updateWithdrawal(child.id, {
        withdrawalDate: null,
        version: child.version,
      });
      setChild(updated);
      setSuccess('Дата выбытия отменена.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка отмены выбытия');
      }
    } finally {
      setWithdrawalLoading(false);
    }
  };

  // --- Handlers: Transfer & Memberships ---
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child || !transferGroupId) return;
    setTransferLoading(true);
    setError(null);
    try {
      await childrenApi.createGroupMembership(child.id, {
        groupId: Number(transferGroupId),
        validFrom: transferValidFrom,
      });
      setIsTransferModalOpen(false);
      setSuccess('Перевод в новую группу успешно зарегистрирован.');
      fetchChild();
      const res = await childrenApi.getGroupMemberships(child.id);
      setMemberships(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка перевода в группу');
      }
    } finally {
      setTransferLoading(false);
    }
  };

  const handleMembershipCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMembership || !editMembershipReason.trim()) {
      alert('Укажите причину исправления');
      return;
    }
    setEditMembershipLoading(true);
    try {
      await childrenApi.updateGroupMembership(editMembership.id, {
        groupId: Number(editMembershipGroupId),
        validFrom: editMembershipValidFrom,
        validTo: editMembershipValidTo || null,
        reason: editMembershipReason.trim(),
      });
      setEditMembership(null);
      setSuccess('История пребывания в группе исправлена.');
      const res = await childrenApi.getGroupMemberships(childId);
      setMemberships(res);
      fetchChild();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка исправления членства');
      }
    } finally {
      setEditMembershipLoading(false);
    }
  };

  // --- Handlers: Financials (Opening, Adjustment, Refund) ---
  const handleOpeningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child || openingAmount === '') return;
    setOpeningLoading(true);
    setError(null);

    const payload = { amount: Number(openingAmount), reason: openingReason.trim() };
    const idempotencyKey = openingTracker.getKey(payload);

    try {
      const updatedAcc = await childrenApi.createOpeningBalance(child.id, payload, idempotencyKey);
      setAccount(updatedAcc);
      openingTracker.reset();
      setIsOpeningModalOpen(false);
      setSuccess('Начальный остаток успешно зафиксирован.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка ввода начального остатка');
      }
    } finally {
      setOpeningLoading(false);
    }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child || adjustmentAmount === '' || !adjustmentReason.trim()) {
      alert('Заполните сумму и обязательную причину корректировки');
      return;
    }
    setAdjustmentLoading(true);
    setError(null);

    const payload = {
      amount: Number(adjustmentAmount),
      reason: adjustmentReason.trim(),
      invoiceId: adjustmentInvoiceId ? Number(adjustmentInvoiceId) : null,
    };
    const idempotencyKey = adjustmentTracker.getKey(payload);

    try {
      const updatedAcc = await childrenApi.createAdjustment(child.id, payload, idempotencyKey);
      setAccount(updatedAcc);
      adjustmentTracker.reset();
      setIsAdjustmentModalOpen(false);
      setSuccess('Ручная корректировка успешно проведена.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка корректировки баланса');
      }
    } finally {
      setAdjustmentLoading(false);
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child || refundAmount === '' || Number(refundAmount) <= 0) {
      alert('Укажите положительную сумму возврата');
      return;
    }
    if (account && Number(refundAmount) > account.credit) {
      alert(`Сумма возврата не может превышать доступную переплату (${formatMoney(account.credit)})`);
      return;
    }
    setRefundLoading(true);
    setError(null);

    const payload = {
      amount: Number(refundAmount),
      paidOn: refundPaidOn,
      reason: refundReason.trim(),
    };
    const idempotencyKey = refundTracker.getKey(payload);

    try {
      const updatedAcc = await childrenApi.createRefund(child.id, payload, idempotencyKey);
      setAccount(updatedAcc);
      refundTracker.reset();
      setIsRefundModalOpen(false);
      setSuccess('Возврат переплаты родителю успешно оформлен.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка оформления возврата');
      }
    } finally {
      setRefundLoading(false);
    }
  };

  // --- Handlers: Illness Certificates ---
  const handleCertSubmit = async (e: React.FormEvent, confirmOverride = false) => {
    e.preventDefault();
    if (!child) return;
    setCertLoading(true);
    setError(null);

    try {
      await childrenApi.createIllnessCertificate(child.id, {
        dateFrom: certDateFrom,
        dateTo: certDateTo,
        receivedOn: certReceivedOn,
        lateReason: certLateReason.trim() || undefined,
        confirmAttendanceOverride: confirmOverride,
      });

      setIsCertModalOpen(false);
      setCertConflictDates(null);
      setSuccess('Справка о болезни успешно подтверждена.');
      const res = await childrenApi.getIllnessCertificates(child.id);
      setCertificates(res);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 && (err.code === 'ATTENDANCE_CONFLICT' || err.conflictDates)) {
          setCertConflictDates(err.conflictDates || ['Даты посещения уже отмечены как присутствовал']);
        } else {
          setError(err.detail || err.title || 'Ошибка подтверждения справки о болезни');
        }
      } else {
        setError('Не удалось сохранить справку.');
      }
    } finally {
      setCertLoading(false);
    }
  };

  const handleRevokeCertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeCertId || !revokeReason.trim()) {
      alert('Укажите причину отзыва справки');
      return;
    }
    setRevokeLoading(true);
    try {
      await childrenApi.revokeIllnessCertificate(revokeCertId, { reason: revokeReason.trim() });
      setRevokeCertId(null);
      setRevokeReason('');
      setSuccess('Справка отозвана. Она исключена из расчёта вычетов.');
      const res = await childrenApi.getIllnessCertificates(childId);
      setCertificates(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка отзыва справки');
      }
    } finally {
      setRevokeLoading(false);
    }
  };

  // --- Handlers: Price Overrides ---
  const handlePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child || priceAmount === '' || !priceReason.trim()) {
      alert('Заполните сумму и обязательную причину индивидуальной цены');
      return;
    }
    setPriceLoading(true);
    setError(null);
    try {
      if (editingPriceId) {
        await childrenApi.updatePriceOverride(editingPriceId, {
          monthlyAmount: Number(priceAmount),
          validFrom: priceValidFrom,
          validTo: priceValidTo || null,
          reason: priceReason.trim(),
          version: priceVersion,
        });
        setSuccess('Индивидуальная цена обновлена.');
      } else {
        await childrenApi.createPriceOverride(child.id, {
          monthlyAmount: Number(priceAmount),
          validFrom: priceValidFrom,
          validTo: priceValidTo || null,
          reason: priceReason.trim(),
        });
        setSuccess('Индивидуальная цена добавлена.');
      }
      setIsPriceModalOpen(false);
      const res = await childrenApi.getPriceOverrides(child.id);
      setPriceOverrides(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка сохранения индивидуальной цены');
      }
    } finally {
      setPriceLoading(false);
    }
  };

  if (loadingChild) {
    return <Loading text="Загрузка карточки ребёнка..." />;
  }

  if (!child) {
    return (
      <EmptyState
        title="Ребёнок не найден"
        description="Карточка с таким идентификатором отсутствует."
        action={
          <Link to="/admin/children" className="btn btn-secondary btn-sm">
            Вернуться к списку
          </Link>
        }
      />
    );
  }

  const hasWithdrawalDate = !!child.withdrawalDate;

  return (
    <div>
      {/* Top Breadcrumb & Summary Header */}
      <div style={{ marginBottom: '1rem' }}>
        <Link
          to="/admin/children"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={14} /> Назад к списку детей
        </Link>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.5rem' }}>{child.fullName}</h1>
              <EnrollmentBadge child={child} />
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              <span>
                Группа: <strong style={{ color: 'var(--navy-900)' }}>{child.groupName || 'Не назначена'}</strong>
              </span>
              <span>
                Дата рождения: <strong style={{ color: 'var(--navy-900)' }}>{formatDate(child.birthDate)}</strong>
              </span>
              <span>
                Дата поступления: <strong style={{ color: 'var(--navy-900)' }}>{formatDate(child.admissionDate)}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTransferGroupId(child.groupId || (groups[0]?.id ?? ''));
                setTransferValidFrom(getTodayDateString());
                setIsTransferModalOpen(true);
              }}
            >
              <Users size={14} /> Перевести в группу
            </Button>

            {hasWithdrawalDate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReopenAdmission}
                loading={withdrawalLoading}
              >
                <RotateCcw size={14} /> Отменить выбытие
              </Button>
            )}
            <Button
              variant={hasWithdrawalDate ? 'secondary' : 'danger'}
              size="sm"
              onClick={() => {
                setWithdrawalDateInput(child.withdrawalDate ?? getTodayDateString());
                setIsWithdrawModalOpen(true);
              }}
            >
              <UserX size={14} /> {hasWithdrawalDate ? 'Изменить дату выбытия' : 'Оформить выбытие'}
            </Button>
          </div>
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}
      {success && <Alert type="success" className="mb-4">{success}</Alert>}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <User size={15} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
          Карточка и контакты
        </button>
        <button
          className={`tab-btn ${activeTab === 'memberships' ? 'active' : ''}`}
          onClick={() => setActiveTab('memberships')}
        >
          <History size={15} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
          История групп
        </button>
        <button
          className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <CreditCard size={15} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
          Лицевой счёт и баланс
        </button>
        <button
          className={`tab-btn ${activeTab === 'illness' ? 'active' : ''}`}
          onClick={() => setActiveTab('illness')}
        >
          <FileText size={15} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
          Справки о болезни
        </button>
        <button
          className={`tab-btn ${activeTab === 'prices' ? 'active' : ''}`}
          onClick={() => setActiveTab('prices')}
        >
          <Tag size={15} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
          Индивидуальная цена
        </button>
      </div>

      {/* Tab 1: Info and Contacts */}
      {activeTab === 'info' && (
        <div className="card">
          <h3 className="card-title">Редактирование данных воспитанника</h3>
          <form onSubmit={handleSaveChild}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <Input
                label="ФИО ребёнка"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                required
              />
              <Input
                label="Дата рождения"
                type="date"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
                required
              />
              <Input
                label="Дата поступления"
                type="date"
                value={editAdmissionDate}
                onChange={(e) => setEditAdmissionDate(e.target.value)}
                required
              />
            </div>

            <Textarea
              label="Комментарий администратора"
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              placeholder="Особые отметки, медицинские рекомендации"
            />

            <div style={{ marginTop: '1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Контакты родителей и законных представителей</h4>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddContact}>
                <Plus size={14} /> Добавить контакт
              </Button>
            </div>

            {editContacts.map((contact, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <Input
                    label="ФИО представителя"
                    value={contact.representativeName}
                    onChange={(e) => handleContactChange(idx, 'representativeName', e.target.value)}
                    placeholder="Мама / Папа / Опекун"
                  />
                  <Input
                    label="Номер телефона"
                    value={contact.phone}
                    onChange={(e) => handleContactChange(idx, 'phone', e.target.value)}
                    placeholder="+7 700 000-00-00"
                  />
                  <Input
                    label="Комментарий к контакту"
                    value={contact.comment || ''}
                    onChange={(e) => handleContactChange(idx, 'comment', e.target.value)}
                    placeholder="Звонить до 18:00"
                  />
                </div>
                <div style={{ textAlign: 'right', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red-600)', fontSize: '0.75rem' }}
                    onClick={() => handleRemoveContact(idx)}
                  >
                    Удалить контакт
                  </button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <Button type="submit" variant="primary" loading={savingChild}>
                <Save size={16} /> Сохранить изменения
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Group Memberships History */}
      {activeTab === 'memberships' && (
        <div className="card">
          <div className="card-title">
            <span>История пребывания в группах</span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setTransferGroupId(groups[0]?.id ?? '');
                setTransferValidFrom(getTodayDateString());
                setIsTransferModalOpen(true);
              }}
            >
              <Plus size={14} /> Перевести в другую группу
            </Button>
          </div>

          {loadingData ? (
            <Loading text="Загрузка истории групп..." />
          ) : memberships.length === 0 ? (
            <EmptyState title="Нет записей о группах" description="История зачислений пуста." />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Группа</th>
                    <th>Действует с</th>
                    <th>Действует по</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((m) => {
                    const isCurrent = !m.validTo;
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>{m.groupName}</td>
                        <td>{formatDate(m.validFrom)}</td>
                        <td>{m.validTo ? formatDate(m.validTo) : 'По настоящее время'}</td>
                        <td>
                          {isCurrent ? (
                            <Badge variant="teal">Текущая группа</Badge>
                          ) : (
                            <Badge variant="gray">Архив</Badge>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditMembership(m);
                              setEditMembershipGroupId(m.groupId);
                              setEditMembershipValidFrom(m.validFrom);
                              setEditMembershipValidTo(m.validTo || '');
                              setEditMembershipReason('');
                            }}
                          >
                            Исправить
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

      {/* Tab 3: Account & Balance */}
      {activeTab === 'account' && (
        <div>
          {loadingData ? (
            <Loading text="Загрузка финансового счёта..." />
          ) : account ? (
            <>
              {/* Account Summary Metrics */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div>
                    <div className="metric-title">Текущий баланс</div>
                    <div
                      className="metric-value"
                      style={{
                        color:
                          account.balance > 0
                            ? 'var(--red-600)'
                            : account.balance < 0
                            ? 'var(--teal-700)'
                            : 'var(--navy-900)',
                      }}
                    >
                      {formatSignedMoney(account.balance)}
                    </div>
                  </div>
                  <div className="metric-sub">
                    {account.balance > 0
                      ? 'Задолженность родителя'
                      : account.balance < 0
                      ? 'Переплата (аванс)'
                      : 'Баланс нулевой'}
                  </div>
                </div>

                <div className="metric-card">
                  <div>
                    <div className="metric-title">Задолженность</div>
                    <div className="metric-value" style={{ color: 'var(--red-600)' }}>
                      {formatMoney(account.debt)}
                    </div>
                  </div>
                  <div className="metric-sub">Текущий долг по лицевому счёту</div>
                </div>

                <div className="metric-card">
                  <div>
                    <div className="metric-title">Доступная переплата</div>
                    <div className="metric-value" style={{ color: 'var(--teal-700)' }}>
                      {formatMoney(account.credit)}
                    </div>
                  </div>
                  <div className="metric-sub">Может быть возвращена или зачтена</div>
                </div>
              </div>

              {/* Financial Action Buttons */}
              <div className="card" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" onClick={() => setIsOpeningModalOpen(true)}>
                  <DollarSign size={14} /> Ввести начальный остаток
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setIsAdjustmentModalOpen(true)}>
                  <DollarSign size={14} /> Ручная корректировка
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={account.credit <= 0}
                  onClick={() => setIsRefundModalOpen(true)}
                >
                  <DollarSign size={14} /> Оформить возврат переплаты
                </Button>
              </div>

              {/* Ledger Entries */}
              <div className="card">
                <h3 className="card-title">История финансовых операций (Главная книга)</h3>
                {account.entries?.length === 0 ? (
                  <EmptyState title="Операций нет" description="Начисления и платежи отсутствуют." />
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Дата</th>
                          <th>Тип операции</th>
                          <th>Сумма (влияние на долг)</th>
                          <th>Причина / Обоснование</th>
                          <th>Связанный документ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {account.entries.map((entry) => (
                          <tr key={entry.id}>
                            <td style={{ fontSize: '0.8125rem' }}>{formatDateTime(entry.createdAt)}</td>
                            <td>
                              <Badge
                                variant={
                                  entry.amount > 0 ? 'red' : entry.amount < 0 ? 'green' : 'gray'
                                }
                              >
                                {formatAccountEntryType(entry.type)}
                              </Badge>
                            </td>
                            <td className="amount" style={{ fontWeight: 600 }}>
                              {formatSignedMoney(entry.amount)}
                            </td>
                            <td>{entry.reason || '—'}</td>
                            <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                              {entry.invoiceId ? `Счёт #${entry.invoiceId}` : entry.paymentId ? `Платёж #${entry.paymentId}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyState title="Счёт не найден" description="Не удалось загрузить данные счёта." />
          )}
        </div>
      )}

      {/* Tab 4: Illness Certificates */}
      {activeTab === 'illness' && (
        <div className="card">
          <div className="card-title">
            <span>Справки о болезни и вычеты</span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCertDateFrom(getTodayDateString());
                setCertDateTo(getTodayDateString());
                setCertReceivedOn(getTodayDateString());
                setCertLateReason('');
                setCertConflictDates(null);
                setIsCertModalOpen(true);
              }}
            >
              <Plus size={14} /> Подтвердить справку
            </Button>
          </div>

          <div style={{ marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Дни подтверждённой болезни исключаются из начисления питания. Опоздание со сдачей справки (&gt; 7 дней после болезни) требует обязательного обоснования администратором.
          </div>

          {loadingData ? (
            <Loading text="Загрузка справок..." />
          ) : !certificates || certificates.content.length === 0 ? (
            <EmptyState title="Справок нет" description="Периодов болезни не зафиксировано." />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Период болезни</th>
                    <th>Дата получения</th>
                    <th>Подтверждена</th>
                    <th>Причина задержки</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.content.map((cert) => {
                    const isRevoked = !!cert.revokedAt;
                    return (
                      <tr key={cert.id}>
                        <td style={{ fontWeight: 600 }}>
                          {formatDate(cert.dateFrom)} — {formatDate(cert.dateTo)}
                        </td>
                        <td>{formatDate(cert.receivedOn)}</td>
                        <td>{formatDateTime(cert.confirmedAt)}</td>
                        <td>{cert.lateReason || '—'}</td>
                        <td>
                          {isRevoked ? (
                            <Badge variant="red">
                              Отозвана ({formatDate(cert.revokedAt)}): {cert.revocationReason}
                            </Badge>
                          ) : (
                            <Badge variant="green">
                              <CheckCircle size={12} /> Подтверждена
                            </Badge>
                          )}
                        </td>
                        <td>
                          {!isRevoked && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--red-600)' }}
                              onClick={() => {
                                setRevokeCertId(cert.id);
                                setRevokeReason('');
                              }}
                            >
                              Отозвать
                            </button>
                          )}
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

      {/* Tab 5: Price Overrides */}
      {activeTab === 'prices' && (
        <div className="card">
          <div className="card-title">
            <span>Индивидуальные цены (скидки/надбавки)</span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingPriceId(null);
                setPriceAmount('');
                setPriceValidFrom(getTodayDateString());
                setPriceValidTo('');
                setPriceReason('');
                setPriceVersion(0);
                setIsPriceModalOpen(true);
              }}
            >
              <Plus size={14} /> Назначить индивидуальную цену
            </Button>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Индивидуальная цена имеет приоритет над общим возрастным тарифом в указанный период действия.
          </p>

          {loadingData ? (
            <Loading text="Загрузка индивидуальных цен..." />
          ) : priceOverrides.length === 0 ? (
            <EmptyState
              title="Индивидуальных цен нет"
              description="Ребёнок обслуживается по стандартному возрастному тарифу."
            />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ежемесячная цена</th>
                    <th>Действует с</th>
                    <th>Действует по</th>
                    <th>Причина / Основание</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {priceOverrides.map((po) => (
                    <tr key={po.id}>
                      <td className="amount" style={{ fontWeight: 600, color: 'var(--teal-700)' }}>
                        {formatMoney(po.monthlyAmount)}
                      </td>
                      <td>{formatDate(po.validFrom)}</td>
                      <td>{po.validTo ? formatDate(po.validTo) : 'Бессрочно'}</td>
                      <td>{po.reason}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditingPriceId(po.id);
                            setPriceAmount(po.monthlyAmount);
                            setPriceValidFrom(po.validFrom);
                            setPriceValidTo(po.validTo || '');
                            setPriceReason(po.reason);
                            setPriceVersion(po.version);
                            setIsPriceModalOpen(true);
                          }}
                        >
                          Редактировать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Withdrawal Modal */}
      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        title="Оформление выбытия ребёнка"
      >
        <form onSubmit={handleWithdrawalSubmit}>
          <Alert type="warning" className="mb-4">
            После оформления выбытия начисления за дни после даты выбытия производиться не будут.
          </Alert>
          <Input
            label="Дата выбытия"
            type="date"
            value={withdrawalDateInput}
            onChange={(e) => setWithdrawalDateInput(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsWithdrawModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="danger" loading={withdrawalLoading}>
              Оформить выбытие
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Group Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Перевод в другую группу"
      >
        <form onSubmit={handleTransferSubmit}>
          <Select
            label="Новая группа"
            value={transferGroupId}
            onChange={(e) => setTransferGroupId(Number(e.target.value))}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
            required
          />
          <Input
            label="Дата перевода (действует с)"
            type="date"
            value={transferValidFrom}
            onChange={(e) => setTransferValidFrom(e.target.value)}
            required
            hint="Предыдущее членство автоматически закроется предыдущим днём."
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsTransferModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={transferLoading}>
              Перевести
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Group Membership Correction Modal */}
      <Modal
        isOpen={!!editMembership}
        onClose={() => setEditMembership(null)}
        title="Исправление истории группы"
      >
        <form onSubmit={handleMembershipCorrectionSubmit}>
          <Select
            label="Группа"
            value={editMembershipGroupId}
            onChange={(e) => setEditMembershipGroupId(Number(e.target.value))}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input
              label="Дата с"
              type="date"
              value={editMembershipValidFrom}
              onChange={(e) => setEditMembershipValidFrom(e.target.value)}
              required
            />
            <Input
              label="Дата по"
              type="date"
              value={editMembershipValidTo}
              onChange={(e) => setEditMembershipValidTo(e.target.value)}
              hint="Пусто — по настоящее время"
            />
          </div>
          <Input
            label="Обязательная причина исправления"
            value={editMembershipReason}
            onChange={(e) => setEditMembershipReason(e.target.value)}
            required
            placeholder="Например: Ошибка при первоначальном вводе"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setEditMembership(null)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={editMembershipLoading}>
              Сохранить исправление
            </Button>
          </div>
        </form>
      </Modal>

      {/* Opening Balance Modal */}
      <Modal
        isOpen={isOpeningModalOpen}
        onClose={() => setIsOpeningModalOpen(false)}
        title="Ввод начального остатка"
      >
        <form onSubmit={handleOpeningSubmit}>
          <Alert type="info" className="mb-4">
            Положительная сумма означает долг родителя (+10 000 ₸). Отрицательная — переплату (-5 000 ₸).
            Вводится один раз при начале работы с системой.
          </Alert>
          <Input
            label="Сумма (в тенге, со знаком)"
            type="number"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value === '' ? '' : Number(e.target.value))}
            required
            placeholder="Например: 15000 или -5000"
          />
          <Input
            label="Обоснование / примечание"
            value={openingReason}
            onChange={(e) => setOpeningReason(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsOpeningModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={openingLoading}>
              Зафиксировать остаток
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjustment Modal */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="Ручная финансовая корректировка"
      >
        <form onSubmit={handleAdjustmentSubmit}>
          <Alert type="warning" className="mb-4">
            Корректировка со знаком: положительная сумма увеличивает долг, отрицательная — уменьшает долг или увеличивает переплату.
          </Alert>
          <Input
            label="Сумма корректировки (со знаком)"
            type="number"
            value={adjustmentAmount}
            onChange={(e) => setAdjustmentAmount(e.target.value === '' ? '' : Number(e.target.value))}
            required
            placeholder="Например: -2500 или 3000"
          />
          <Input
            label="Обязательная причина корректировки"
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value)}
            required
            placeholder="Основание для бухгалтерской записи"
          />
          <Input
            label="ID счёта (необязательно)"
            type="number"
            value={adjustmentInvoiceId}
            onChange={(e) => setAdjustmentInvoiceId(e.target.value)}
            placeholder="Связать с конкретным счётом"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAdjustmentModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={adjustmentLoading}>
              Провести корректировку
            </Button>
          </div>
        </form>
      </Modal>

      {/* Refund Modal */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="Оформление возврата переплаты родителю"
      >
        <form onSubmit={handleRefundSubmit}>
          <Alert type="info" className="mb-4">
            Доступная к возврату переплата: <strong>{formatMoney(account?.credit || 0)}</strong>.
            Сумма возврата уменьшает переплату на счёте ребёнка.
          </Alert>
          <Input
            label="Сумма возврата (в тенге)"
            type="number"
            min="1"
            max={account?.credit || 0}
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
          <Input
            label="Дата выплаты"
            type="date"
            value={refundPaidOn}
            onChange={(e) => setRefundPaidOn(e.target.value)}
            required
          />
          <Input
            label="Основание возврата"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsRefundModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={refundLoading}>
              Выплатить возврат
            </Button>
          </div>
        </form>
      </Modal>

      {/* Illness Certificate Modal (Handles Late Reason & 409 Conflict) */}
      <Modal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        title="Регистрация справки о болезни"
        maxWidth="600px"
      >
        <form onSubmit={(e) => handleCertSubmit(e, false)}>
          {certConflictDates ? (
            <div
              style={{
                backgroundColor: 'var(--amber-50)',
                border: '1px solid var(--amber-200)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--amber-800)', fontWeight: 600 }}>
                <AlertTriangle size={18} />
                <span>Конфликт с отметками посещаемости</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--amber-900)', marginBottom: '0.5rem' }}>
                В период справки ребёнок был отмечен как <strong>ПРИСУТСТВОВАЛ</strong> на следующие даты:
              </p>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--amber-800)', marginBottom: '0.75rem' }}>
                {certConflictDates.map((d, i) => (
                  <li key={i}>{formatDate(d)}</li>
                ))}
              </ul>
              <p style={{ fontSize: '0.875rem', color: 'var(--amber-900)', marginBottom: '1rem' }}>
                Подтверждение справки перезапишет посещаемость на статус <strong>ОТСУТСТВУЕТ (БОЛЕЗНЬ)</strong> для рабочих дней.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button type="button" variant="secondary" size="sm" onClick={() => setCertConflictDates(null)}>
                  Отмена
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  loading={certLoading}
                  onClick={(e) => handleCertSubmit(e, true)}
                >
                  Перезаписать и подтвердить
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input
                  label="Дата начала болезни"
                  type="date"
                  value={certDateFrom}
                  onChange={(e) => setCertDateFrom(e.target.value)}
                  required
                />
                <Input
                  label="Дата окончания болезни"
                  type="date"
                  value={certDateTo}
                  onChange={(e) => setCertDateTo(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Дата фактического получения справки"
                type="date"
                value={certReceivedOn}
                onChange={(e) => setCertReceivedOn(e.target.value)}
                required
                hint="Если прошло более 7 дней после окончания болезни, укажите объяснение."
              />

              <Input
                label="Объяснение при поздней сдаче справки"
                value={certLateReason}
                onChange={(e) => setCertLateReason(e.target.value)}
                placeholder="Например: Задержка в поликлинике, уважительная причина"
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <Button type="button" variant="secondary" onClick={() => setIsCertModalOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" variant="primary" loading={certLoading}>
                  Подтвердить справку
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Revoke Cert Modal */}
      <Modal
        isOpen={!!revokeCertId}
        onClose={() => setRevokeCertId(null)}
        title="Отзыв справки о болезни"
      >
        <form onSubmit={handleRevokeCertSubmit}>
          <Alert type="warning" className="mb-4">
            Отозванная справка исключается из расчёта вычетов за питание. Дни посещаемости остаются в статусе «Отсутствует».
          </Alert>
          <Input
            label="Обязательная причина отзыва"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            required
            placeholder="Например: Ошибочно введённые даты"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setRevokeCertId(null)}>
              Отмена
            </Button>
            <Button type="submit" variant="danger" loading={revokeLoading}>
              Отозвать справку
            </Button>
          </div>
        </form>
      </Modal>

      {/* Price Override Modal */}
      <Modal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        title={editingPriceId ? 'Редактирование индивидуальной цены' : 'Назначение индивидуальной цены'}
      >
        <form onSubmit={handlePriceSubmit}>
          <Input
            label="Ежемесячная сумма (в тенге)"
            type="number"
            min="0"
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value === '' ? '' : Number(e.target.value))}
            required
            placeholder="Например: 35000"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input
              label="Действует с"
              type="date"
              value={priceValidFrom}
              onChange={(e) => setPriceValidFrom(e.target.value)}
              required
            />
            <Input
              label="Действует по"
              type="date"
              value={priceValidTo}
              onChange={(e) => setPriceValidTo(e.target.value)}
              hint="Пусто — бессрочно"
            />
          </div>
          <Input
            label="Причина / Основание"
            value={priceReason}
            onChange={(e) => setPriceReason(e.target.value)}
            required
            placeholder="Льгота многодетным / соглашение"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsPriceModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={priceLoading}>
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
