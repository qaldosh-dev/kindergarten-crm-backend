import { apiClient } from './client';
import { AttendanceResponse, AttendanceSaveItem } from '../types/domain';

export const attendanceApi = {
  getAttendance: (groupId: number, date: string) =>
    apiClient.get<AttendanceResponse>(`/groups/${groupId}/attendance`, { date }),

  saveAttendance: (
    groupId: number,
    date: string,
    data: { items: AttendanceSaveItem[]; reason?: string }
  ) =>
    apiClient.put<AttendanceResponse>(`/groups/${groupId}/attendance`, data, {
      params: { date },
    }),
};
