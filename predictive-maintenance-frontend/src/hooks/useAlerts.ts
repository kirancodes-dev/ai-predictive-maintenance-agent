import { useQuery, useMutation, useQueryClient } from 'react-query';
import { alertApi } from '../services/api/alertApi';

export const useAlerts = (params?: Record<string, unknown>) => {
  return useQuery(
    ['alerts', params],
    () => alertApi.getAll(params).then((r) => r.data.data),
    { refetchInterval: 10_000 },
  );
};

export const useAcknowledgeAlert = () => {
  const qc = useQueryClient();
  return useMutation((id: string) => alertApi.acknowledge(id), {
    onSuccess: () => qc.invalidateQueries('alerts'),
  });
};

export const useResolveAlert = () => {
  const qc = useQueryClient();
  return useMutation((id: string) => alertApi.resolve(id), {
    onSuccess: () => qc.invalidateQueries('alerts'),
  });
};
