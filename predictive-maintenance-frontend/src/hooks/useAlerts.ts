import { useQuery, useMutation, useQueryClient } from 'react-query';
import { alertApi } from '../services/api/alertApi';
import type { AlertFilter } from '../types/alert.types';

export const useAlerts = (filter?: AlertFilter) => {
  return useQuery(['alerts', filter], () => alertApi.getAll(filter).then(r => r.data), {
    refetchInterval: 10000,
  });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  return useMutation((id: string) => alertApi.acknowledge(id), {
    onSuccess: () => queryClient.invalidateQueries(['alerts']),
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  return useMutation((id: string) => alertApi.resolve(id), {
    onSuccess: () => queryClient.invalidateQueries(['alerts']),
  });
};
