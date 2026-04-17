import { apiClient } from './apiClient';
import type { AlertListResponse } from '../../types/alert.types';

export const alertApi = {
  getAll: (params?: Record<string, unknown>) =>
    apiClient.get<{ data: AlertListResponse }>('/alerts', { params }),
  acknowledge: (id: string) =>
    apiClient.patch(`/alerts/${id}/acknowledge`),
  resolve: (id: string) =>
    apiClient.patch(`/alerts/${id}/resolve`),
};
