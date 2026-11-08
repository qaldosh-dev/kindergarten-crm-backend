import { apiClient, downloadFile } from './client';
import { BillingReport } from '../types/domain';

export const reportsApi = {
  getBillingReport: (month: string) =>
    apiClient.get<BillingReport>('/reports/billing', { month }),

  downloadBillingCsv: async (month: string): Promise<void> => {
    const blob = await downloadFile('/reports/billing.csv', { month });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `billing-${month}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
