import { apiClient } from './apiClient';

export interface SensorReadingDto {
  sensorId: string;
  machineId: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
  isAnomaly: boolean;
}

export interface SensorHistoryDto {
  sensorId: string;
  type: string;
  data: Array<{ timestamp: string; value: number }>;
}

export const streamApi = {
  getLive: (machineId: string) =>
    apiClient.get<{ data: SensorReadingDto[]; success: boolean }>(`/stream/${machineId}/live`),

  getHistory: (machineId: string, from: string, to: string) =>
    apiClient.get<{ data: SensorHistoryDto[]; success: boolean }>(
      `/stream/${machineId}/history`,
      { params: { from, to } },
    ),

  getBaseline: (machineId: string) =>
    apiClient.get(`/stream/${machineId}/baseline`),
};
