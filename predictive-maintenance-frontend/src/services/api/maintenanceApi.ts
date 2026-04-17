import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';
import type { MaintenanceRecord, MaintenanceScheduleRequest, FailurePrediction } from '../../types/maintenance.types';
import type { ApiResponse, PaginatedResponse } from '../../types/api.types';

export const maintenanceApi = {
  getAll: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<MaintenanceRecord>>(ENDPOINTS.MAINTENANCE, { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<MaintenanceRecord>>(ENDPOINTS.MAINTENANCE_DETAIL(id)),

  schedule: (data: MaintenanceScheduleRequest) =>
    apiClient.post<ApiResponse<MaintenanceRecord>>(ENDPOINTS.MAINTENANCE, data),

  update: (id: string, data: Partial<MaintenanceScheduleRequest>) =>
    apiClient.patch<ApiResponse<MaintenanceRecord>>(ENDPOINTS.MAINTENANCE_DETAIL(id), data),

  delete: (id: string) =>
    apiClient.delete(ENDPOINTS.MAINTENANCE_DETAIL(id)),

  getPredictions: () =>
    apiClient.get<ApiResponse<FailurePrediction[]>>(ENDPOINTS.MAINTENANCE_PREDICTIONS),
};
