import { apiClient } from './client';
import { Page } from '../types/api';
import {
  Account,
  Child,
  ChildContact,
  ChildGroupMembership,
  IllnessCertificate,
  PriceOverride,
} from '../types/domain';

export const childrenApi = {
  getChildren: (params?: {
    groupId?: number | string;
    active?: boolean | string;
    search?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) => apiClient.get<Page<Child>>('/children', params),

  getChild: (id: number) => apiClient.get<Child>(`/children/${id}`),

  createChild: (data: {
    fullName: string;
    birthDate: string;
    admissionDate: string;
    groupId: number;
    comment?: string;
    contacts: ChildContact[];
  }) => apiClient.post<Child>('/children', data),

  updateChild: (
    id: number,
    data: {
      fullName: string;
      birthDate: string;
      admissionDate: string;
      comment?: string;
      contacts: ChildContact[];
      version: number;
    }
  ) => apiClient.patch<Child>(`/children/${id}`, data),

  updateWithdrawal: (id: number, data: { withdrawalDate: string | null; version: number }) =>
    apiClient.put<Child>(`/children/${id}/withdrawal`, data),

  getGroupMemberships: (childId: number) =>
    apiClient.get<ChildGroupMembership[]>(`/children/${childId}/group-memberships`),

  createGroupMembership: (childId: number, data: { groupId: number; validFrom: string }) =>
    apiClient.post<ChildGroupMembership>(`/children/${childId}/group-memberships`, data),

  updateGroupMembership: (
    membershipId: number,
    data: { groupId: number; validFrom: string; validTo: string | null; reason: string }
  ) => apiClient.patch<ChildGroupMembership>(`/group-memberships/${membershipId}`, data),

  // Account & Financials
  getChildAccount: (childId: number) => apiClient.get<Account>(`/children/${childId}/account`),

  createOpeningBalance: (
    childId: number,
    data: { amount: number; reason: string },
    idempotencyKey?: string
  ) =>
    apiClient.post<Account>(`/children/${childId}/opening-balance`, data, { idempotencyKey }),

  createAdjustment: (
    childId: number,
    data: { amount: number; reason: string; invoiceId: number | null },
    idempotencyKey?: string
  ) =>
    apiClient.post<Account>(`/children/${childId}/adjustments`, data, { idempotencyKey }),

  createRefund: (
    childId: number,
    data: { amount: number; paidOn: string; reason: string },
    idempotencyKey?: string
  ) =>
    apiClient.post<Account>(`/children/${childId}/refunds`, data, { idempotencyKey }),

  // Price Overrides
  getPriceOverrides: (childId: number) =>
    apiClient.get<PriceOverride[]>(`/children/${childId}/price-overrides`),

  createPriceOverride: (
    childId: number,
    data: { monthlyAmount: number; validFrom: string; validTo: string | null; reason: string }
  ) => apiClient.post<PriceOverride>(`/children/${childId}/price-overrides`, data),

  updatePriceOverride: (
    id: number,
    data: { monthlyAmount: number; validFrom: string; validTo: string | null; reason: string; version: number }
  ) => apiClient.patch<PriceOverride>(`/price-overrides/${id}`, data),

  // Illness Certificates
  getIllnessCertificates: (childId: number, params?: { page?: number; size?: number }) =>
    apiClient.get<Page<IllnessCertificate>>(`/children/${childId}/illness-certificates`, params),

  createIllnessCertificate: (
    childId: number,
    data: {
      dateFrom: string;
      dateTo: string;
      receivedOn: string;
      lateReason?: string;
      confirmAttendanceOverride?: boolean;
    }
  ) => apiClient.post<IllnessCertificate>(`/children/${childId}/illness-certificates`, data),

  revokeIllnessCertificate: (id: number, data: { reason: string }) =>
    apiClient.post<IllnessCertificate>(`/illness-certificates/${id}/revoke`, data),
};
