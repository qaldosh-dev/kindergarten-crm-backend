import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types/api';
import { ChangePasswordDialog } from './ChangePasswordDialog';

interface RoleGuardProps {
  allowedRoles?: Role[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, mustChangePassword } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If teacher tries to access admin route, redirect to teacher root
    if (user.role === 'TEACHER') {
      return <Navigate to="/teacher" replace />;
    }
    // If admin tries to access teacher route or other, redirect to admin root
    return <Navigate to="/admin" replace />;
  }

  return (
    <>
      <Outlet />
      {mustChangePassword && (
        <ChangePasswordDialog
          isOpen={true}
          isForced={true}
          onClose={() => {}}
        />
      )}
    </>
  );
};
