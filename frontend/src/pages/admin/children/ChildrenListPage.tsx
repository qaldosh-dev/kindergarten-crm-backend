import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Filter,
  Plus,
  Search,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { childrenApi } from '../../../api/children';
import { groupsApi } from '../../../api/groups';
import { Child, ChildContact, Group } from '../../../types/domain';
import { Page } from '../../../types/api';
import { formatDate } from '../../../utils/formatters';
import { getTodayDateString } from '../../../utils/dates';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { Badge } from '../../../components/common/Badge';
import { Modal } from '../../../components/common/Modal';
import { Alert } from '../../../components/common/Alert';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { Pagination } from '../../../components/common/Pagination';
import { ApiError } from '../../../api/client';

export const ChildrenListPage: React.FC = () => {
  const [childrenPage, setChildrenPage] = useState<Page<Child> | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('true');
  const [page, setPage] = useState(0);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [admissionDate, setAdmissionDate] = useState(getTodayDateString());
  const [newChildGroupId, setNewChildGroupId] = useState<number | ''>('');
  const [comment, setComment] = useState('');
  const [contacts, setContacts] = useState<ChildContact[]>([
    { representativeName: '', phone: '', relation: 'PARENT', comment: '' },
  ]);

  // Load groups for filter
  useEffect(() => {
    groupsApi.getGroups({ active: true, size: 100 })
      .then((res) => {
        setGroups(res.content || []);
        if (res.content?.length > 0 && newChildGroupId === '') {
          setNewChildGroupId(res.content[0].id);
        }
      })
      .catch(() => {});
  }, [newChildGroupId]);

  const fetchChildren = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeParam = activeFilter === '' ? undefined : activeFilter === 'true';
      const data = await childrenApi.getChildren({
        search: search.trim() || undefined,
        groupId: groupId ? Number(groupId) : undefined,
        active: activeParam,
        page,
        size: 15,
      });
      setChildrenPage(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || err.title || 'Ошибка загрузки списка детей');
      } else {
        setError('Не удалось подключиться к серверу.');
      }
    } finally {
      setLoading(false);
    }
  }, [search, groupId, activeFilter, page]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchChildren();
  };

  const handleAddContact = () => {
    setContacts((prev) => [
      ...prev,
      { representativeName: '', phone: '', relation: 'PARENT', comment: '' },
    ]);
  };

  const handleRemoveContact = (index: number) => {
    if (contacts.length <= 1) return;
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContactChange = (index: number, field: keyof ChildContact, value: string) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!fullName.trim()) {
      setCreateError('Введите ФИО ребёнка');
      return;
    }
    if (!birthDate) {
      setCreateError('Укажите дату рождения');
      return;
    }
    if (!admissionDate) {
      setCreateError('Укажите дату поступления');
      return;
    }
    if (!newChildGroupId) {
      setCreateError('Выберите группу для зачисления');
      return;
    }

    setCreateLoading(true);
    try {
      await childrenApi.createChild({
        fullName: fullName.trim(),
        birthDate,
        admissionDate,
        groupId: Number(newChildGroupId),
        comment: comment.trim(),
        contacts: contacts.filter((c) => c.representativeName.trim() || c.phone.trim()),
      });

      setIsCreateOpen(false);
      // Reset form
      setFullName('');
      setBirthDate('');
      setAdmissionDate(getTodayDateString());
      setComment('');
      setContacts([{ representativeName: '', phone: '', relation: 'PARENT', comment: '' }]);
      fetchChildren();
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.detail || err.title || 'Ошибка создания карточки ребёнка');
      } else {
        setCreateError('Не удалось создать запись ребёнка.');
      }
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Дети</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Список воспитанников, группы, контакты и управление карточками
          </p>
        </div>

        <div className="page-header-actions">
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} />
            Зачислить ребёнка
          </Button>
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label className="form-label">Поиск по ФИО</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Фамилия Имя Отчество"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search
                size={16}
                style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-light)', pointerEvents: 'none' }}
              />
            </div>
          </div>

          <div style={{ width: '200px' }}>
            <label className="form-label">Группа</label>
            <select
              className="form-select"
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Все группы</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '180px' }}>
            <label className="form-label">Статус</label>
            <select
              className="form-select"
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Все статусы</option>
              <option value="true">Только активные</option>
              <option value="false">Выбывшие</option>
            </select>
          </div>

          <Button type="submit" variant="secondary" style={{ height: '38px' }}>
            <Filter size={15} />
            Применить
          </Button>
        </form>
      </div>

      {/* Children Table */}
      {loading ? (
        <Loading text="Загрузка списка детей..." />
      ) : !childrenPage || childrenPage.content.length === 0 ? (
        <EmptyState
          icon={<Users size={40} style={{ color: 'var(--navy-300)' }} />}
          title="Дети не найдены"
          description="По заданным фильтрам не найдено ни одного ребёнка. Попробуйте изменить параметры поиска или добавить нового ребёнка."
          action={
            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus size={15} />
              Зачислить ребёнка
            </Button>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Группа</th>
                <th>Дата рождения</th>
                <th>Поступление</th>
                <th>Статус</th>
                <th>Контакты</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {childrenPage.content.map((child) => {
                const isWithdrawn = !!child.withdrawalDate;
                const primaryContact = child.contacts && child.contacts[0];

                return (
                  <tr key={child.id}>
                    <td style={{ fontWeight: 600 }}>
                      <Link
                        to={`/admin/children/${child.id}`}
                        style={{ color: 'var(--navy-900)', textDecoration: 'none' }}
                      >
                        {child.fullName}
                      </Link>
                    </td>
                    <td>{child.groupName || '—'}</td>
                    <td>{formatDate(child.birthDate)}</td>
                    <td>{formatDate(child.admissionDate)}</td>
                    <td>
                      {isWithdrawn ? (
                        <Badge variant="red">
                          <UserX size={12} />
                          Выбыл {formatDate(child.withdrawalDate)}
                        </Badge>
                      ) : (
                        <Badge variant="green">
                          <UserCheck size={12} />
                          Активен
                        </Badge>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {primaryContact ? (
                        <div>
                          <div>{primaryContact.representativeName}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{primaryContact.phone}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/admin/children/${child.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        Карточка
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination
            page={childrenPage.page}
            totalPages={childrenPage.totalPages}
            totalElements={childrenPage.totalElements}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      )}

      {/* Create Child Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Зачисление нового ребёнка"
        maxWidth="680px"
      >
        <form onSubmit={handleCreateSubmit}>
          {createError && <Alert type="error" className="mb-4">{createError}</Alert>}

          <Input
            label="ФИО ребёнка"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Например: Ахметов Азамат Серикович"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Дата рождения"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
            <Input
              label="Дата поступления"
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              required
            />
          </div>

          <Select
            label="Группа"
            value={newChildGroupId}
            onChange={(e) => setNewChildGroupId(Number(e.target.value))}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
            required
          />

          <Input
            label="Примечание / комментарий"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Дополнительная информация (аллергии, особенности)"
          />

          <div style={{ marginTop: '1.25rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '0.9375rem', color: 'var(--navy-900)' }}>Контакты представителей</h4>
            <Button type="button" variant="ghost" size="sm" onClick={handleAddContact}>
              <Plus size={14} /> Добавить контакт
            </Button>
          </div>

          {contacts.map((contact, index) => (
            <div
              key={index}
              style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '0.75rem',
                position: 'relative',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input
                  label="ФИО представителя"
                  value={contact.representativeName}
                  onChange={(e) => handleContactChange(index, 'representativeName', e.target.value)}
                  placeholder="Мама / Папа / Представитель"
                />
                <Input
                  label="Телефон"
                  value={contact.phone}
                  onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                  placeholder="+7 (701) 000-00-00"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Отношение: Родитель</span>
                {contacts.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red-600)', fontSize: '0.75rem' }}
                    onClick={() => handleRemoveContact(index)}
                  >
                    Удалить
                  </button>
                )}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={createLoading}
            >
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={createLoading}>
              Зачислить ребёнка
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
