import React, { useEffect, useState, useCallback } from 'react';
import {
  Ban,
  CheckCircle,
  KeyRound,
  Plus,
  School,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { groupsApi } from '../../../api/groups';
import { authApi } from '../../../api/auth';
import { Group, TeacherAssignment } from '../../../types/domain';
import { Page, User } from '../../../types/api';
import { formatDate } from '../../../utils/formatters';
import { getTodayDateString } from '../../../utils/dates';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Badge } from '../../../components/common/Badge';
import { Modal } from '../../../components/common/Modal';
import { Alert } from '../../../components/common/Alert';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { Pagination } from '../../../components/common/Pagination';
import { ApiError } from '../../../api/client';

export const GroupsAndStaffPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'groups' | 'teachers'>('groups');

  // --- Groups State ---
  const [groupsPage, setGroupsPage] = useState<Page<Group>>({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  // Group Create/Edit Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupActive, setGroupActive] = useState(true);
  const [groupSaveLoading, setGroupSaveLoading] = useState(false);

  // Group Teacher Assignments Modal
  const [assignmentGroup, setAssignmentGroup] = useState<Group | null>(null);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [newAssignmentTeacherId, setNewAssignmentTeacherId] = useState<number | ''>('');
  const [newAssignmentValidFrom, setNewAssignmentValidFrom] = useState(getTodayDateString());
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Edit Assignment Modal
  const [editingAssignment, setEditingAssignment] = useState<TeacherAssignment | null>(null);
  const [editAssignValidFrom, setEditAssignValidFrom] = useState('');
  const [editAssignValidTo, setEditAssignValidTo] = useState('');
  const [savingEditAssign, setSavingEditAssign] = useState(false);

  // --- Teachers State ---
  const [usersPage, setUsersPage] = useState<Page<User>>({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  const [allTeachersList, setAllTeachersList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Teacher Create Modal
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherLogin, setTeacherLogin] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherCreateLoading, setTeacherCreateLoading] = useState(false);

  // Teacher Reset Password Modal
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Teacher Edit Login Modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editUserLogin, setEditUserLogin] = useState('');
  const [editUserLoading, setEditUserLoading] = useState(false);

  // --- Fetch Groups ---
  const fetchGroups = useCallback(async (page = 0) => {
    setLoadingGroups(true);
    setGroupsError(null);
    try {
      const res = await groupsApi.getGroups({ page, size: 20 });
      setGroupsPage(res);
    } catch {
      setGroupsError('Не удалось загрузить список групп.');
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // --- Fetch Users ---
  const fetchUsers = useCallback(async (page = 0) => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const res = await authApi.getUsers({ page, size: 20 });
      setUsersPage(res);
      // Filter out only active teachers for assignment dropdown
      const teachers = res.content.filter((u) => u.role === 'TEACHER' && u.active !== false);
      setAllTeachersList(teachers);
    } catch {
      setUsersError('Не удалось загрузить учётные записи сотрудников.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, [fetchGroups, fetchUsers]);

  // --- Handlers: Group Save ---
  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setGroupSaveLoading(true);
    try {
      if (editingGroup) {
        await groupsApi.updateGroup(editingGroup.id, {
          name: groupName.trim(),
          active: groupActive,
          version: editingGroup.version,
        });
      } else {
        await groupsApi.createGroup({ name: groupName.trim() });
      }
      setIsGroupModalOpen(false);
      fetchGroups(groupsPage.page);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.detail || err.title || 'Ошибка сохранения группы');
      }
    } finally {
      setGroupSaveLoading(false);
    }
  };

  // --- Handlers: Assignments ---
  const openAssignmentsModal = async (group: Group) => {
    setAssignmentGroup(group);
    setLoadingAssignments(true);
    try {
      const res = await groupsApi.getTeacherAssignments(group.id);
      setAssignments(res || []);
      if (allTeachersList.length > 0) {
        setNewAssignmentTeacherId(allTeachersList[0].id);
      }
    } catch {
      alert('Не удалось загрузить назначения воспитателей');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentGroup || !newAssignmentTeacherId) return;
    setSavingAssignment(true);
    try {
      await groupsApi.createTeacherAssignment(assignmentGroup.id, {
        teacherId: Number(newAssignmentTeacherId),
        validFrom: newAssignmentValidFrom,
        validTo: null,
      });
      const res = await groupsApi.getTeacherAssignments(assignmentGroup.id);
      setAssignments(res || []);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.detail || err.title || 'Ошибка назначения воспитателя');
      }
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleEditAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !assignmentGroup) return;
    setSavingEditAssign(true);
    try {
      await groupsApi.updateTeacherAssignment(editingAssignment.id, {
        validFrom: editAssignValidFrom,
        validTo: editAssignValidTo || null,
      });
      setEditingAssignment(null);
      const res = await groupsApi.getTeacherAssignments(assignmentGroup.id);
      setAssignments(res || []);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.detail || err.title || 'Ошибка изменения периода назначения');
      }
    } finally {
      setSavingEditAssign(false);
    }
  };

  // --- Handlers: Teacher User Management ---
  const handleTeacherCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherLogin.trim() || !teacherPassword) return;
    setTeacherCreateLoading(true);
    try {
      await authApi.createUser({ login: teacherLogin.trim(), password: teacherPassword });
      setIsTeacherModalOpen(false);
      setTeacherLogin('');
      setTeacherPassword('');
      fetchUsers(usersPage.page);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.detail || err.title || 'Ошибка создания воспитателя');
      }
    } finally {
      setTeacherCreateLoading(false);
    }
  };

  const handleToggleUserActive = async (user: User) => {
    const actionText = user.active !== false ? 'заблокировать' : 'разблокировать';
    if (!window.confirm(`Вы уверены, что хотите ${actionText} аккаунт ${user.login}?`)) return;

    try {
      await authApi.updateUser(user.id, {
        active: user.active === false,
        version: user.version ?? 0,
      });
      fetchUsers(usersPage.page);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.detail || err.title || 'Ошибка изменения статуса пользователя');
      }
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !resetNewPassword) return;
    setResetLoading(true);
    try {
      await authApi.resetPassword(resetUser.id, { newPassword: resetNewPassword });
      setResetUser(null);
      setResetNewPassword('');
      alert('Пароль успешно сброшен. При следующем входе пользователю будет предложено установить новый постоянный пароль.');
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.detail || err.title || 'Ошибка сброса пароля');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || !editUserLogin.trim()) return;
    setEditUserLoading(true);
    try {
      await authApi.updateUser(editUser.id, {
        login: editUserLogin.trim(),
        version: editUser.version ?? 0,
      });
      setEditUser(null);
      fetchUsers(usersPage.page);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.detail || err.title || 'Ошибка обновления логина');
      }
    } finally {
      setEditUserLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Группы и персонал</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Управление группами детского сада, расписанием воспитателей и учётными записями
          </p>
        </div>

        <div className="page-header-actions">
          {activeTab === 'groups' ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditingGroup(null);
                setGroupName('');
                setGroupActive(true);
                setIsGroupModalOpen(true);
              }}
            >
              <Plus size={16} /> Создать группу
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                setTeacherLogin('');
                setTeacherPassword('');
                setIsTeacherModalOpen(true);
              }}
            >
              <UserPlus size={16} /> Добавить воспитателя
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <School size={16} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
          Группы детского сада
        </button>
        <button
          className={`tab-btn ${activeTab === 'teachers' ? 'active' : ''}`}
          onClick={() => setActiveTab('teachers')}
        >
          <Users size={16} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
          Учётные записи воспитателей
        </button>
      </div>

      {/* --- TAB 1: Groups --- */}
      {activeTab === 'groups' && (
        <div>
          {groupsError && <Alert type="error" className="mb-4">{groupsError}</Alert>}

          {loadingGroups ? (
            <Loading text="Загрузка групп..." />
          ) : groupsPage.content.length === 0 ? (
            <EmptyState
              title="Групп нет"
              description="В детском саду пока не создано ни одной группы."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingGroup(null);
                    setGroupName('');
                    setGroupActive(true);
                    setIsGroupModalOpen(true);
                  }}
                >
                  <Plus size={14} /> Создать группу
                </Button>
              }
            />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Название группы</th>
                    <th>Статус</th>
                    <th>Назначения воспитателей</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {groupsPage.content.map((group) => (
                    <tr key={group.id}>
                      <td style={{ fontWeight: 600 }}>{group.name}</td>
                      <td>
                        {group.active ? (
                          <Badge variant="green">Активна</Badge>
                        ) : (
                          <Badge variant="gray">Архив</Badge>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openAssignmentsModal(group)}
                        >
                          <UserCheck size={14} /> Назначения воспитателей
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditingGroup(group);
                            setGroupName(group.name);
                            setGroupActive(group.active);
                            setIsGroupModalOpen(true);
                          }}
                        >
                          Редактировать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Pagination
                page={groupsPage.page}
                totalPages={groupsPage.totalPages}
                totalElements={groupsPage.totalElements}
                onPageChange={(p) => fetchGroups(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: Teachers --- */}
      {activeTab === 'teachers' && (
        <div>
          {usersError && <Alert type="error" className="mb-4">{usersError}</Alert>}

          {loadingUsers ? (
            <Loading text="Загрузка списка сотрудников..." />
          ) : usersPage.content.length === 0 ? (
            <EmptyState title="Сотрудники не найдены" description="Список пуст." />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Логин</th>
                    <th>Роль</th>
                    <th>Статус аккаунта</th>
                    <th>Смена пароля</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {usersPage.content.map((u) => {
                    const isBlocked = u.active === false;
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.login}</td>
                        <td>
                          <Badge variant={u.role === 'ADMIN' ? 'teal' : 'gray'}>
                            {u.role === 'ADMIN' ? 'Администратор' : 'Воспитатель'}
                          </Badge>
                        </td>
                        <td>
                          {isBlocked ? (
                            <Badge variant="red">Заблокирован</Badge>
                          ) : (
                            <Badge variant="green">Активен</Badge>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8125rem' }}>
                          {u.mustChangePassword ? (
                            <Badge variant="amber">Требуется смена</Badge>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Обычный</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              title="Редактировать логин"
                              onClick={() => {
                                setEditUser(u);
                                setEditUserLogin(u.login);
                              }}
                            >
                              Логин
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              title="Сбросить пароль"
                              onClick={() => {
                                setResetUser(u);
                                setResetNewPassword('');
                              }}
                            >
                              <KeyRound size={13} />
                              Сброс пароля
                            </button>

                            {u.role !== 'ADMIN' && (
                              <button
                                type="button"
                                className={`btn btn-sm ${isBlocked ? 'btn-secondary' : 'btn-ghost'}`}
                                style={{ color: isBlocked ? 'var(--green-700)' : 'var(--red-600)' }}
                                onClick={() => handleToggleUserActive(u)}
                              >
                                {isBlocked ? (
                                  <>
                                    <CheckCircle size={13} /> Разблокировать
                                  </>
                                ) : (
                                  <>
                                    <Ban size={13} /> Заблокировать
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <Pagination
                page={usersPage.page}
                totalPages={usersPage.totalPages}
                totalElements={usersPage.totalElements}
                onPageChange={(p) => fetchUsers(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Create / Edit Group Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title={editingGroup ? 'Редактирование группы' : 'Создание новой группы'}
      >
        <form onSubmit={handleGroupSubmit}>
          <Input
            label="Название группы"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            placeholder="Например: Младшая группа «Солнышко»"
          />

          {editingGroup && (
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="groupActiveCheck"
                checked={groupActive}
                onChange={(e) => setGroupActive(e.target.checked)}
              />
              <label htmlFor="groupActiveCheck" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Группа активна
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsGroupModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={groupSaveLoading}>
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>

      {/* Group Teacher Assignments Modal */}
      <Modal
        isOpen={!!assignmentGroup}
        onClose={() => setAssignmentGroup(null)}
        title={`Воспитатели группы: ${assignmentGroup?.name}`}
        maxWidth="680px"
      >
        <div>
          <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.75rem' }}>Текущие и прошедшие назначения</h4>

          {loadingAssignments ? (
            <Loading text="Загрузка назначений..." />
          ) : assignments.length === 0 ? (
            <Alert type="info" className="mb-4">
              Назначений воспитателей для этой группы нет.
            </Alert>
          ) : (
            <div className="table-container" style={{ marginBottom: '1.5rem' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Воспитатель</th>
                    <th>С даты</th>
                    <th>По дату</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assign) => (
                    <tr key={assign.id}>
                      <td style={{ fontWeight: 600 }}>{assign.teacherLogin}</td>
                      <td>{formatDate(assign.validFrom)}</td>
                      <td>{assign.validTo ? formatDate(assign.validTo) : 'По настоящее время'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditingAssignment(assign);
                            setEditAssignValidFrom(assign.validFrom);
                            setEditAssignValidTo(assign.validTo || '');
                          }}
                        >
                          Изменить период
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.75rem' }}>Назначить воспитателя</h4>
            <form onSubmit={handleCreateAssignment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Воспитатель</label>
                  <select
                    className="form-select"
                    value={newAssignmentTeacherId}
                    onChange={(e) => setNewAssignmentTeacherId(Number(e.target.value))}
                    required
                  >
                    {allTeachersList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.login}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Действует с даты"
                  type="date"
                  value={newAssignmentValidFrom}
                  onChange={(e) => setNewAssignmentValidFrom(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <Button type="submit" variant="primary" size="sm" loading={savingAssignment}>
                  <Plus size={14} /> Добавить назначение
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      {/* Edit Assignment Period Modal */}
      <Modal
        isOpen={!!editingAssignment}
        onClose={() => setEditingAssignment(null)}
        title="Изменение периода назначения"
      >
        <form onSubmit={handleEditAssignmentSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input
              label="Дата начала"
              type="date"
              value={editAssignValidFrom}
              onChange={(e) => setEditAssignValidFrom(e.target.value)}
              required
            />
            <Input
              label="Дата окончания"
              type="date"
              value={editAssignValidTo}
              onChange={(e) => setEditAssignValidTo(e.target.value)}
              hint="Пусто — по настоящее время"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setEditingAssignment(null)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={savingEditAssign}>
              Сохранить период
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Teacher Modal */}
      <Modal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        title="Создание учётной записи воспитателя"
      >
        <form onSubmit={handleTeacherCreate}>
          <Input
            label="Логин (Email)"
            type="text"
            value={teacherLogin}
            onChange={(e) => setTeacherLogin(e.target.value)}
            required
            placeholder="teacher2@demo.local"
          />
          <Input
            label="Временный пароль"
            type="password"
            value={teacherPassword}
            onChange={(e) => setTeacherPassword(e.target.value)}
            required
            hint="Воспитатель будет обязан изменить этот пароль при первом входе."
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsTeacherModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={teacherCreateLoading}>
              Создать воспитателя
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetUser}
        onClose={() => setResetUser(null)}
        title={`Сброс пароля для ${resetUser?.login}`}
      >
        <form onSubmit={handleResetPasswordSubmit}>
          <Alert type="warning" className="mb-4">
            При установке нового пароля все активные токены пользователя инвалидируются, а пользователю будет выставлен признак необходимости смены пароля.
          </Alert>
          <Input
            label="Новый пароль"
            type="password"
            value={resetNewPassword}
            onChange={(e) => setResetNewPassword(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setResetUser(null)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={resetLoading}>
              Сбросить пароль
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Login Modal */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="Редактирование логина сотрудника"
      >
        <form onSubmit={handleEditUserSubmit}>
          <Input
            label="Логин"
            value={editUserLogin}
            onChange={(e) => setEditUserLogin(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setEditUser(null)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={editUserLoading}>
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
