import test from 'node:test';
import assert from 'node:assert/strict';
import { getAttendanceChanges } from '../src/utils/attendance.ts';
import { getEnrollmentState } from '../src/utils/dates.ts';

test('saving one child excludes untouched unmarked children from the request', () => {
  const original = [
    { childId: 1, fullName: 'Первый', status: null, version: null },
    { childId: 2, fullName: 'Второй', status: null, version: null },
    { childId: 3, fullName: 'Третий', status: 'PRESENT', version: 4 },
  ];
  const edited = original.map(item => item.childId === 1 ? { ...item, status: 'ABSENT' } : item);
  assert.deepEqual(getAttendanceChanges(edited, original), [{ childId: 1, status: 'ABSENT', version: null }]);
});

test('existing attendance correction preserves its concurrency version', () => {
  const original = [{ childId: 3, fullName: 'Третий', status: 'PRESENT', version: 4 }];
  const edited = [{ ...original[0], status: 'ABSENT' }];
  assert.deepEqual(getAttendanceChanges(edited, original), [{ childId: 3, status: 'ABSENT', version: 4 }]);
  assert.deepEqual(getAttendanceChanges(original, original), []);
});

test('enrollment status respects inclusive withdrawal and future admission dates', () => {
  assert.equal(getEnrollmentState('2026-09-01', '2026-11-16', '2026-11-08'), 'WITHDRAWAL_PLANNED');
  assert.equal(getEnrollmentState('2026-09-01', '2026-11-08', '2026-11-08'), 'WITHDRAWAL_PLANNED');
  assert.equal(getEnrollmentState('2026-09-01', '2026-11-07', '2026-11-08'), 'WITHDRAWN');
  assert.equal(getEnrollmentState('2026-11-12', null, '2026-11-08'), 'PLANNED');
  assert.equal(getEnrollmentState('2026-09-01', null, '2026-11-08'), 'ACTIVE');
});
