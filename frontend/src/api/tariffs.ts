import { apiClient } from './client';
import { Page } from '../types/api';
import { Tariff } from '../types/domain';

export const tariffsApi = {
  getTariffs: (params?: { page?: number; size?: number; sort?: string }) =>
    apiClient.get<Page<Tariff>>('/tariffs', params),

  createTariff: (data: {
    ageFrom: number;
    ageToExclusive: number | null;
    monthlyAmount: number;
    validFrom: string;
    validTo: string | null;
  }) => apiClient.post<Tariff>('/tariffs', data),

  updateTariff: (
    id: number,
    data: {
      ageFrom?: number;
      ageToExclusive?: number | null;
      monthlyAmount?: number;
      validFrom?: string;
      validTo?: string | null;
      reason: string;
      version: number;
    }
  ) => apiClient.patch<Tariff>(`/tariffs/${id}`, data),
};
