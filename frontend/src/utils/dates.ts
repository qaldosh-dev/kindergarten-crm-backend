/**
 * Timezone Asia/Qyzylorda (UTC+5 standard).
 * Format date in Asia/Qyzylorda.
 */
export function getTodayDateString(): string {
  // Asia/Qyzylorda is UTC+5
  const now = new Date();
  // Using Intl with Asia/Qyzylorda timezone
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Qyzylorda',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = Object.fromEntries(formatter.formatToParts(now).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    // Fallback if environment doesn't recognize timezone
    return new Date(now.getTime() + 5 * 3600000).toISOString().slice(0, 10);
  }
}

export function getCurrentMonthString(): string {
  const today = getTodayDateString();
  return today.substring(0, 7); // YYYY-MM
}

export function getEnrollmentState(admissionDate: string, withdrawalDate: string | null, today: string) {
  if (admissionDate > today) return 'PLANNED';
  if (withdrawalDate && withdrawalDate < today) return 'WITHDRAWN';
  if (withdrawalDate) return 'WITHDRAWAL_PLANNED';
  return 'ACTIVE';
}

export function isPastDate(dateStr: string): boolean {
  const today = getTodayDateString();
  return dateStr < today;
}

export function isToday(dateStr: string): boolean {
  const today = getTodayDateString();
  return dateStr === today;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Returns month day 10 for a given month YYYY-MM
 */
export function getDefaultDueDate(monthStr: string): string {
  return `${monthStr}-10`;
}

/**
 * Check if today is strictly after day 10 of the given month
 */
export function isPastDayTenOfMonth(monthStr: string): boolean {
  const today = getTodayDateString();
  const day10 = `${monthStr}-10`;
  return today > day10;
}
