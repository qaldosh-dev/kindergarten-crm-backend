import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types/api';
import { authApi } from '../api/auth';
import { setAuthToken, setOnUnauthorized } from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserMustChangePassword: (mustChange: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // When a 401 occurs, clear in-memory auth state
    setOnUnauthorized(() => {
      setUser(null);
    });
  }, []);

  const login = async (loginStr: string, passwordStr: string) => {
    const res = await authApi.login({ login: loginStr, password: passwordStr });
    // In-memory token only
    setAuthToken(res.accessToken);
    setUser(res.user);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authApi.changePassword({ currentPassword, newPassword });
    // Token is invalidated by backend per spec; user must log in again
    logout();
  };

  const updateUserMustChangePassword = (mustChange: boolean) => {
    if (user) {
      setUser({ ...user, mustChangePassword: mustChange });
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    mustChangePassword: !!user?.mustChangePassword,
    login,
    logout,
    changePassword,
    updateUserMustChangePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
