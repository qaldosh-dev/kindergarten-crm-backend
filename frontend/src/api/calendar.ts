import { apiClient } from './client';
import { CalendarDay, CalendarMonth } from '../types/domain';

export const calendarApi = {
  getCalendar: (year: number, monthNumber: number) =>
    apiClient.get<CalendarMonth>(`/calendar/${year}/${monthNumber}`),

  updateCalendar: (year: number, monthNumber: number, days: CalendarDay[]) =>
    apiClient.put<CalendarMonth>(`/calendar/${year}/${monthNumber}`, { days }),
};
