import { apiClient } from './client';
import { LoginResponse, Page, User } from '../types/api';

export const authApi = {
  login: (credentials: { login: string; password: string }) =>
    apiClient.post<LoginResponse>('/auth/login', credentials),

  getMe: () => apiClient.get<User>('/me'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post<void>('/auth/change-password', data),

  getUsers: (params?: { page?: number; size?: number; sort?: string }) =>
    apiClient.get<Page<User>>('/users', params),

  createUser: (data: { login: string; password: string }) =>
    apiClient.post<User>('/users', data),

  updateUser: (id: number, data: { login?: string; active?: boolean; version: number }) =>
    apiClient.patch<User>(`/users/${id}`, data),

  resetPassword: (id: number, data: { newPassword: string }) =>
    apiClient.post<void>(`/users/${id}/reset-password`, data),
};
