import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';
import type { Alert, AlertFilter } from '../../types/alert.types';
import type { PaginatedResponse } from '../../types/api.types';

export const alertApi = {
  getAll: (params?: AlertFilter) =>
    apiClient.get<PaginatedResponse<Alert>>(ENDPOINTS.ALERTS, { params }),

  getById: (id: string) =>
    apiClient.get<{ data: Alert }>(ENDPOINTS.ALERT_DETAIL(id)),

  acknowledge: (id: string) =>
    apiClient.post(ENDPOINTS.ALERT_ACKNOWLEDGE(id)),

  resolve: (id: string) =>
    apiClient.post(ENDPOINTS.ALERT_RESOLVE(id)),
};
