import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';
import type { SensorHistory } from '../../types/sensor.types';
import type { ApiResponse, DateRangeParams } from '../../types/api.types';

export const streamApi = {
  getLiveData: (machineId: string) =>
    apiClient.get(ENDPOINTS.STREAM_LIVE(machineId)),

  getHistory: (machineId: string, params: DateRangeParams) =>
    apiClient.get<ApiResponse<SensorHistory[]>>(ENDPOINTS.STREAM_HISTORY(machineId), { params }),
};
