import type { AttendanceItem, AttendanceSaveItem } from '../types/domain';

export function getAttendanceChanges(items: AttendanceItem[], original: AttendanceItem[]): AttendanceSaveItem[] {
  const originalById = new Map(original.map(item => [item.childId, item]));
  return items
    .filter(item => item.status !== null && item.status !== originalById.get(item.childId)?.status)
    .map(item => ({ childId: item.childId, status: item.status, version: item.version }));
}
