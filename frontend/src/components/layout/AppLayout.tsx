import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  CheckSquare,
  CreditCard,
  FileSpreadsheet,
  FileText,
  History,
  KeyRound,
  LogOut,
  Menu,
  School,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatRole } from '../../utils/formatters';
import { ChangePasswordDialog } from './ChangePasswordDialog';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <School size={26} style={{ color: 'var(--teal-500)' }} />
          <div>
            <div className="sidebar-header-title">Детский сад</div>
            <div className="sidebar-header-sub">Управление и биллинг</div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="mobile-menu-btn"
            style={{ marginLeft: 'auto', color: '#fff' }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {user?.role === 'TEACHER' && (
            <NavLink
              to="/teacher"
              end
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={closeMobile}
            >
              <UserCheck size={18} />
              <span>Посещаемость</span>
            </NavLink>
          )}

          {user?.role === 'ADMIN' && (
            <>
              <NavLink
                to="/admin"
                end
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <BarChart3 size={18} />
                <span>Обзор</span>
              </NavLink>

              <NavLink
                to="/admin/children"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <Users size={18} />
                <span>Дети</span>
              </NavLink>

              <NavLink
                to="/admin/groups"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <School size={18} />
                <span>Группы и персонал</span>
              </NavLink>

              <NavLink
                to="/admin/attendance"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <CheckSquare size={18} />
                <span>Посещаемость</span>
              </NavLink>

              <NavLink
                to="/admin/calendar-tariffs"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <Calendar size={18} />
                <span>Календарь и тарифы</span>
              </NavLink>

              <NavLink
                to="/admin/billing"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <FileText size={18} />
                <span>Расчёты и счета</span>
              </NavLink>

              <NavLink
                to="/admin/payments"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <CreditCard size={18} />
                <span>Платежи</span>
              </NavLink>

              <NavLink
                to="/admin/reports"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <FileSpreadsheet size={18} />
                <span>Отчёты</span>
              </NavLink>

              <NavLink
                to="/admin/audit"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                <History size={18} />
                <span>Аудит</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div>Версия 1.0</div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Часовой пояс: Asia/Qyzylorda</div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="top-header">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Открыть меню"
          >
            <Menu size={22} />
          </button>

          <div style={{ flex: 1 }} />

          <div className="header-user-info">
            <div className="user-badge">
              <span className="user-login">{user?.login}</span>
              <span className="user-role">{user ? formatRole(user.role) : ''}</span>
            </div>

            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="btn btn-ghost btn-sm"
              title="Сменить пароль"
              aria-label="Сменить пароль"
            >
              <KeyRound size={16} />
              <span>Пароль</span>
            </button>

            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm"
              title="Выйти"
              aria-label="Выйти"
              style={{ color: 'var(--red-600)' }}
            >
              <LogOut size={16} />
              <span>Выйти</span>
            </button>
          </div>
        </header>

        <main className="page-body">
          <Outlet />
        </main>
      </div>

      <ChangePasswordDialog
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};
