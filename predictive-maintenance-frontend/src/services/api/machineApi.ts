import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';
import type { Machine, MachineDetail } from '../../types/machine.types';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../../types/api.types';

export const machineApi = {
  getAll: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Machine>>(ENDPOINTS.MACHINES, { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<MachineDetail>>(ENDPOINTS.MACHINE_DETAIL(id)),

  getRisk: (id: string) =>
    apiClient.get<ApiResponse<{ score: number; level: string }>>(ENDPOINTS.MACHINE_RISK(id)),

  getSensors: (id: string) =>
    apiClient.get(ENDPOINTS.MACHINE_SENSORS(id)),
};
