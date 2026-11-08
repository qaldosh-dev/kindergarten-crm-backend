import { AttendanceStatus, InvoiceStatus, PaymentMethod } from '../types/domain';
import { Role } from '../types/api';

/**
 * Format integer tenge with thousand space separator.
 * e.g. 50000 -> "50 000 ₸"
 */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ₸';
  }
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} ₸`;
}

/**
 * Format signed integer tenge (+5 000 ₸, -2 000 ₸, 0 ₸).
 */
export function formatSignedMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ₸';
  }
  const rounded = Math.round(amount);
  const formatted = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (rounded > 0) {
    return `+${formatted} ₸`;
  } else if (rounded < 0) {
    return `-${formatted} ₸`;
  }
  return '0 ₸';
}

/**
 * Formats YYYY-MM-DD to DD.MM.YYYY
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  }
  return dateStr;
}

/**
 * Formats ISO timestamp to DD.MM.YYYY HH:mm
 */
export function formatDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return isoStr;
  }
}

const MONTH_NAMES_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

/**
 * Formats YYYY-MM to Russian representation: "Ноябрь 2026"
 */
export function formatMonth(monthStr: string | null | undefined): string {
  if (!monthStr) return '—';
  const parts = monthStr.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const monthNum = parseInt(parts[1], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${MONTH_NAMES_RU[monthNum - 1]} ${year}`;
    }
  }
  return monthStr;
}

export function formatAttendanceStatus(status: AttendanceStatus): string {
  if (status === 'PRESENT') return 'Присутствует';
  if (status === 'ABSENT') return 'Отсутствует';
  return 'Не отмечено';
}

export function formatInvoiceStatus(status: InvoiceStatus): string {
  if (status === 'ISSUED') return 'Выставлен';
  return 'Черновик';
}

export function formatPaymentMethod(method: PaymentMethod | string): string {
  if (method === 'TRANSFER') return 'Безналичный перевод';
  if (method === 'CASH') return 'Наличные';
  return method;
}

export function formatRole(role: Role | string): string {
  if (role === 'ADMIN') return 'Администратор';
  if (role === 'TEACHER') return 'Воспитатель';
  return role;
}

export function formatAccountEntryType(type: string): string {
  switch (type) {
    case 'INITIAL_BALANCE':
    case 'OPENING_BALANCE':
      return 'Начальный остаток';
    case 'CHARGE':
      return 'Начисление за месяц';
    case 'PAYMENT':
      return 'Оплата';
    case 'PAYMENT_CANCEL':
      return 'Отмена платежа';
    case 'RECONCILIATION':
      return 'Сверка (корректировка начисления)';
    case 'ADJUSTMENT':
      return 'Ручная корректировка';
    case 'REFUND':
      return 'Возврат родителю';
    default:
      return type;
  }
}
