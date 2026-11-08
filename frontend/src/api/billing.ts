import { apiClient } from './client';
import { Page } from '../types/api';
import {
  Invoice,
  MonthCalculateResponse,
  ReconciliationPreview,
  ReconciliationResult,
} from '../types/domain';

export const billingApi = {
  calculateMonth: (month: string) =>
    apiClient.post<MonthCalculateResponse>(`/billing/months/${month}/calculate`, {}),

  getInvoices: (params?: {
    month?: string;
    childId?: number;
    status?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) => apiClient.get<Page<Invoice>>('/invoices', params),

  getInvoice: (id: number) =>
    apiClient.get<Invoice>(`/invoices/${id}`),

  issueInvoice: (id: number, data: { version: number; dueDate: string | null }) =>
    apiClient.post<Invoice>(`/invoices/${id}/issue`, data),

  previewReconciliation: (id: number) =>
    apiClient.post<ReconciliationPreview>(`/invoices/${id}/reconciliation-preview`, {}),

  reconcileInvoice: (id: number, data: { reason: string }) =>
    apiClient.post<ReconciliationResult>(`/invoices/${id}/reconcile`, data),
};
