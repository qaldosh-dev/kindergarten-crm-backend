import type { Child } from '../../types/domain';
import { getEnrollmentState, getTodayDateString } from '../../utils/dates';
import { formatDate } from '../../utils/formatters';
import { Badge, type BadgeProps } from './Badge';

export function EnrollmentBadge({ child }: { child: Pick<Child, 'admissionDate' | 'withdrawalDate'> }) {
  const state = getEnrollmentState(child.admissionDate, child.withdrawalDate, getTodayDateString());
  let label = 'Активен';
  let variant: BadgeProps['variant'] = 'green';
  if (state === 'PLANNED') {
    label = `Поступление ${formatDate(child.admissionDate)}`;
    variant = 'gray';
  } else if (state === 'WITHDRAWN') {
    label = `Выбыл ${formatDate(child.withdrawalDate)}`;
    variant = 'red';
  } else if (state === 'WITHDRAWAL_PLANNED') {
    label = `Выбытие ${formatDate(child.withdrawalDate)}`;
    variant = 'amber';
  }
  return <Badge variant={variant}>{label}</Badge>;
}
