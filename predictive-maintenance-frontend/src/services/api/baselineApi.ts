import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';
import type { ApiResponse } from '../../types/api.types';
import type { MachineBaseline } from '../../types/baseline.types';

export const baselineApi = {
  getBaseline: (machineId: string) =>
    apiClient.get<ApiResponse<MachineBaseline>>(ENDPOINTS.STREAM_BASELINE(machineId)),
};
