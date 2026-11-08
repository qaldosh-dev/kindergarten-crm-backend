import { apiClient } from './client';
import { Page } from '../types/api';
import { AuditEvent } from '../types/domain';

export const auditApi = {
  getAuditEvents: (params?: {
    page?: number;
    size?: number;
    entityType?: string;
    entityId?: number | string;
    actorId?: number | string;
    sort?: string;
  }) => apiClient.get<Page<AuditEvent>>('/audit-events', params),
};
