import { apiClient } from './client';
import { Page } from '../types/api';
import { Group, TeacherAssignment } from '../types/domain';

export const groupsApi = {
  getGroups: (params?: { active?: boolean; page?: number; size?: number; sort?: string }) =>
    apiClient.get<Page<Group>>('/groups', params),

  createGroup: (data: { name: string }) =>
    apiClient.post<Group>('/groups', data),

  updateGroup: (id: number, data: { name?: string; active?: boolean; version: number }) =>
    apiClient.patch<Group>(`/groups/${id}`, data),

  getTeacherAssignments: (groupId: number) =>
    apiClient.get<TeacherAssignment[]>(`/groups/${groupId}/teacher-assignments`),

  createTeacherAssignment: (groupId: number, data: { teacherId: number; validFrom: string; validTo: string | null }) =>
    apiClient.post<TeacherAssignment>(`/groups/${groupId}/teacher-assignments`, data),

  updateTeacherAssignment: (id: number, data: { validFrom: string; validTo: string | null }) =>
    apiClient.patch<TeacherAssignment>(`/teacher-assignments/${id}`, data),

  getTeacherTodayGroups: () =>
    apiClient.get<Group[]>('/teacher/groups'),
};
