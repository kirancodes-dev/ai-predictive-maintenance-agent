import { apiClient } from './apiClient';
import type { MachineListResponse, Machine } from '../../types/machine.types';

export const machineApi = {
  getAll: (params?: Record<string, unknown>) =>
    apiClient.get<{ data: MachineListResponse }>('/machines', { params }),
  getById: (id: string) =>
    apiClient.get<{ data: Machine }>(`/machines/${id}`),
};
