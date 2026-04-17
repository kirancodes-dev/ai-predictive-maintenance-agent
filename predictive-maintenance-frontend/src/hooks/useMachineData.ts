import { useQuery } from 'react-query';
import { machineApi } from '../services/api/machineApi';
import type { PaginationParams } from '../types/api.types';

export const useMachineData = (params?: PaginationParams) => {
  return useQuery(['machines', params], () => machineApi.getAll(params).then(r => r.data), {
    staleTime: 30000,
    refetchInterval: 60000,
  });
};

export const useMachineDetail = (id: string) => {
  return useQuery(['machine', id], () => machineApi.getById(id).then(r => r.data.data), {
    enabled: !!id,
    staleTime: 30000,
  });
};
