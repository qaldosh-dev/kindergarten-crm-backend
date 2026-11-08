import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleGuard } from './components/layout/RoleGuard';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { TeacherAttendancePage } from './pages/teacher/TeacherAttendancePage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { ChildrenListPage } from './pages/admin/children/ChildrenListPage';
import { ChildDetailPage } from './pages/admin/children/ChildDetailPage';
import { GroupsAndStaffPage } from './pages/admin/groups/GroupsAndStaffPage';
import { AdminAttendancePage } from './pages/admin/attendance/AdminAttendancePage';
import { CalendarTariffsPage } from './pages/admin/calendar-tariffs/CalendarTariffsPage';
import { BillingPage } from './pages/admin/billing/BillingPage';
import { PaymentsPage } from './pages/admin/payments/PaymentsPage';
import { ReportsPage } from './pages/admin/reports/ReportsPage';
import { AuditPage } from './pages/admin/audit/AuditPage';

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/teacher" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Teacher Routes */}
          <Route element={<RoleGuard allowedRoles={['TEACHER']} />}>
            <Route path="/teacher" element={<AppLayout />}>
              <Route index element={<TeacherAttendancePage />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<RoleGuard allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="children" element={<ChildrenListPage />} />
              <Route path="children/:id" element={<ChildDetailPage />} />
              <Route path="groups" element={<GroupsAndStaffPage />} />
              <Route path="attendance" element={<AdminAttendancePage />} />
              <Route path="calendar-tariffs" element={<CalendarTariffsPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit" element={<AuditPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
