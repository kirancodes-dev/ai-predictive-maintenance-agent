import { apiClient } from './apiClient';
import type { Alert, AlertListResponse, AlertSummary, CreateAlertPayload } from '../../types/alert.types';

export const alertApi = {
  getAll: (params?: Record<string, unknown>) =>
    apiClient.get<{ data: AlertListResponse }>('/alerts', { params }),
  getSummary: () =>
    apiClient.get<{ data: AlertSummary }>('/alerts/summary'),
  create: (payload: CreateAlertPayload) =>
    apiClient.post<{ data: Alert }>('/alerts', payload),
  acknowledge: (id: string) =>
    apiClient.patch<{ data: Alert; message?: string }>(`/alerts/${id}/acknowledge`),
  resolve: (id: string) =>
    apiClient.patch<{ data: Alert; message?: string }>(`/alerts/${id}/resolve`),
};
