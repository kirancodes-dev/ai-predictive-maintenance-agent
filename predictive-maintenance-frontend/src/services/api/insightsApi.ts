import { apiClient } from './apiClient';

export const insightsApi = {
  getOverview: () => apiClient.get('/insights/overview'),
  getAnalysis: (machineId: string) => apiClient.get(`/insights/${machineId}/analysis`),
  getPhase: (machineId: string) => apiClient.get(`/insights/${machineId}/phase`),
};
