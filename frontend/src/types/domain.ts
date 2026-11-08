// --- Groups & Teachers ---
export interface Group {
  id: number;
  name: string;
  active: boolean;
  version: number;
}

export interface TeacherAssignment {
  id: number;
  teacherId: number;
  teacherLogin: string;
  groupId: number;
  validFrom: string; // YYYY-MM-DD
  validTo: string | null; // YYYY-MM-DD
}

// --- Children & Contacts ---
export type ContactRelation = 'PARENT' | 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER';

export interface ChildContact {
  id?: number;
  representativeName: string;
  phone: string;
  relation: string; // usually PARENT
  comment?: string;
}

export interface Child {
  id: number;
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  admissionDate: string; // YYYY-MM-DD
  withdrawalDate: string | null;
  groupId?: number;
  groupName?: string;
  comment?: string;
  contacts: ChildContact[];
  version: number;
}

export interface ChildGroupMembership {
  id: number;
  groupId: number;
  groupName: string;
  validFrom: string;
  validTo: string | null;
}

// --- Attendance ---
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | null;

export interface AttendanceItem {
  childId: number;
  fullName: string;
  status: AttendanceStatus;
  version: number | null;
  updatedAt?: string | null;
  updatedBy?: string | number | null;
}

export interface AttendanceResponse {
  groupId: number;
  date: string; // YYYY-MM-DD
  workingDay: boolean;
  closed: boolean;
  items: AttendanceItem[];
}

export interface AttendanceSaveItem {
  childId: number;
  status: AttendanceStatus;
  version: number | null;
}

// --- Illness Certificates ---
export interface IllnessCertificate {
  id: number;
  childId: number;
  dateFrom: string;
  dateTo: string;
  receivedOn: string;
  confirmedAt: string | null;
  lateReason?: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
}

// --- Calendar ---
export interface CalendarDay {
  date: string; // YYYY-MM-DD
  baseWorking: boolean;
  closed: boolean;
  reason?: string | null;
  version?: number;
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDay[];
}

// --- Tariffs & Overrides ---
export interface Tariff {
  id: number;
  ageFrom: number;
  ageToExclusive: number | null;
  monthlyAmount: number;
  validFrom: string; // YYYY-MM-DD
  validTo: string | null;
  version: number;
}

export interface PriceOverride {
  id: number;
  childId?: number;
  monthlyAmount: number;
  validFrom: string;
  validTo: string | null;
  reason: string;
  version: number;
}

// --- Billing & Invoices ---
export type InvoiceStatus = 'DRAFT' | 'ISSUED';

export type ExcludedReason = 'ILLNESS' | 'CLOSED' | 'OUTSIDE_ENROLLMENT' | string;

export interface ExcludedDay {
  date: string;
  reasons: ExcludedReason[];
}

export interface TariffPeriod {
  from: string;
  to: string;
  monthlyAmount: number;
  payableDays: number;
}

export interface Calculation {
  workingDays: number;
  payableDays: number;
  amount: number;
  excludedDays: ExcludedDay[];
  tariffPeriods: TariffPeriod[];
  explanation: string;
}

export interface Invoice {
  id: number;
  childId: number;
  childName: string;
  month: string; // YYYY-MM
  status: InvoiceStatus;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  issuedAt: string | null;
  needsReconciliation: boolean;
  version: number;
  calculation: Calculation;
}

export interface MonthCalculateItemResult {
  childId: number;
  childName: string;
  invoiceId?: number;
  status: 'CALCULATED' | 'ALREADY_ISSUED' | 'ERROR';
  message?: string;
}

export interface MonthCalculateResponse {
  month: string;
  results: MonthCalculateItemResult[];
}

export interface ReconciliationPreview {
  invoiceId: number;
  previousAmount: number;
  newAmount: number;
  difference: number;
  calculation: Calculation;
}

export interface ReconciliationResult {
  invoiceId: number;
  previousAmount: number;
  newAmount: number;
  difference: number;
  entryId: number | null;
}

// --- Account & Payments ---
export type AccountEntryType =
  | 'INITIAL_BALANCE'
  | 'CHARGE'
  | 'PAYMENT'
  | 'RECONCILIATION'
  | 'ADJUSTMENT'
  | 'REFUND'
  | string;

export interface AccountEntry {
  id: number;
  type: AccountEntryType;
  amount: number; // signed relative to debt: positive debt, negative credit/payment
  createdAt: string;
  reason?: string | null;
  invoiceId?: number | null;
  paymentId?: number | null;
}

export type PaymentMethod = 'CASH' | 'TRANSFER';

export interface Payment {
  id: number;
  childId: number;
  childName?: string;
  amount: number;
  paidOn: string; // YYYY-MM-DD
  method: PaymentMethod;
  comment?: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
}

export interface Account {
  childId: number;
  balance: number; // positive debt, negative credit
  debt: number;
  credit: number;
  entries: AccountEntry[];
  payments: Payment[];
}

// --- Reports ---
export interface BillingReportRow {
  childId: number;
  childName: string;
  groupName: string;
  charged: number;
  paid: number;
  refunded: number;
  balance: number;
  debt: number;
  credit: number;
  needsReconciliation: boolean;
}

export interface BillingReport {
  month: string;
  totalCharged: number;
  totalPaid: number;
  totalRefunded: number;
  totalDebt: number;
  totalCredit: number;
  rows: BillingReportRow[];
}

// --- Audit ---
export interface AuditEvent {
  id: number;
  actorId: number;
  actorLogin: string;
  occurredAt: string;
  entityType: string;
  entityId: number | string;
  action: string;
  before: unknown;
  after: unknown;
  reason?: string | null;
}
