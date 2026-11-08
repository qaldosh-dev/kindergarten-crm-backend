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
    return formatter.format(now); // Produces YYYY-MM-DD
  } catch {
    // Fallback if environment doesn't recognize timezone
    const offsetHours = 5;
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const qyzTime = new Date(utcTime + 3600000 * offsetHours);
    const y = qyzTime.getFullYear();
    const m = String(qyzTime.getMonth() + 1).padStart(2, '0');
    const d = String(qyzTime.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

export function getCurrentMonthString(): string {
  const today = getTodayDateString();
  return today.substring(0, 7); // YYYY-MM
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
