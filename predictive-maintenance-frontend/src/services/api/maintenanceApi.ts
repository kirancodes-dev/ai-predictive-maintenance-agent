import { apiClient } from './apiClient';
import type { FailurePrediction } from '../../types/maintenance.types';

export const maintenanceApi = {
  getAll: (params?: Record<string, unknown>) =>
    apiClient.get('/maintenance', { params }),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/maintenance', data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/maintenance/${id}`, data),
  getPredictions: () =>
    apiClient.get<{ data: FailurePrediction[] }>('/maintenance/predictions'),
};
