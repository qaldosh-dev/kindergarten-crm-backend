import { apiClient } from './client';
import { Page } from '../types/api';
import { Payment, PaymentMethod } from '../types/domain';

export const paymentsApi = {
  getPayments: (params?: {
    childId?: number | string;
    month?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) => apiClient.get<Page<Payment>>('/payments', params),

  createPayment: (
    data: {
      childId: number;
      amount: number;
      paidOn: string;
      method: PaymentMethod;
      comment?: string;
    },
    idempotencyKey?: string
  ) => apiClient.post<Payment>('/payments', data, { idempotencyKey }),

  cancelPayment: (id: number, data: { reason: string }) =>
    apiClient.post<Payment>(`/payments/${id}/cancel`, data),
};
