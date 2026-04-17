import { apiClient } from './apiClient';
import type { RichPrediction, Technician } from '../../types/maintenance.types';

export const predictionApi = {
  /** All persisted predictions (tracked by automation loop) */
  getAll: (params?: { urgency?: string }) =>
    apiClient.get<{ data: RichPrediction[] }>('/predictions', { params }),

  /** Live on-the-fly predictions for all machines */
  getLive: () =>
    apiClient.get<{ data: RichPrediction[] }>('/predictions/live'),

  /** Prediction for a single machine */
  getForMachine: (machineId: string) =>
    apiClient.get<{ data: RichPrediction }>(`/predictions/${machineId}`),
};

export const technicianApi = {
  getAll: () =>
    apiClient.get<{ data: Technician[] }>('/technicians'),

  getAvailable: () =>
    apiClient.get<{ data: Technician[] }>('/technicians/available'),

  updateAvailability: (
    id: string,
    body: { is_available: boolean; current_assignment_machine_id?: string; current_assignment_machine_name?: string },
  ) => apiClient.patch<{ data: Technician }>(`/technicians/${id}/availability`, body),
};
