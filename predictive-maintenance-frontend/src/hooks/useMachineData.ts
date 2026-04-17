import { useQuery, useMutation, useQueryClient } from 'react-query';
import { machineApi } from '../services/api/machineApi';

export const useMachineData = (params?: Record<string, unknown>) => {
  return useQuery(
    ['machines', params],
    () => machineApi.getAll(params).then((r) => r.data.data),
    { refetchInterval: 10_000 },
  );
};

export const useMachineDetail = (id: string) => {
  return useQuery(
    ['machine', id],
    () => machineApi.getById(id).then((r) => r.data.data),
    { enabled: !!id, refetchInterval: 15_000 },
  );
};
