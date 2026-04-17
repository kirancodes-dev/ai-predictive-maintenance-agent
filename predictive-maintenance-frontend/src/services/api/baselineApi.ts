import { apiClient } from './apiClient';
import type { MachineBaseline } from '../../types/baseline.types';

export const baselineApi = {
  getBaseline: (machineId: string) =>
    apiClient.get<{ data: MachineBaseline; success: boolean }>(`/stream/${machineId}/baseline`),
};
