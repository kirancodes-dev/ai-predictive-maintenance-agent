import { useQuery, useMutation, useQueryClient } from 'react-query';
import { alertApi } from '../services/api/alertApi';
import type { CreateAlertPayload } from '../types/alert.types';
import toast from 'react-hot-toast';

export const useAlerts = (params?: Record<string, unknown>) => {
  return useQuery(
    ['alerts', params],
    () => alertApi.getAll(params).then((r) => r.data.data),
    { refetchInterval: 10_000 },
  );
};

export const useAlertSummary = () => {
  return useQuery(
    'alert-summary',
    () => alertApi.getSummary().then((r) => r.data.data),
    { refetchInterval: 15_000 },
  );
};

export const useCreateAlert = () => {
  const qc = useQueryClient();
  return useMutation(
    (payload: CreateAlertPayload) => alertApi.create(payload),
    {
      onSuccess: () => {
        qc.invalidateQueries('alerts');
        qc.invalidateQueries('alert-summary');
        toast.success('Alert reported successfully');
      },
      onError: () => {
        toast.error('Failed to report alert');
      },
    },
  );
};

export const useAcknowledgeAlert = () => {
  const qc = useQueryClient();
  return useMutation((id: string) => alertApi.acknowledge(id), {
    onSuccess: () => {
      qc.invalidateQueries('alerts');
      qc.invalidateQueries('alert-summary');
      toast.success('Alert acknowledged');
    },
    onError: () => {
      toast.error('Failed to acknowledge alert');
    },
  });
};

export const useResolveAlert = () => {
  const qc = useQueryClient();
  return useMutation((id: string) => alertApi.resolve(id), {
    onSuccess: () => {
      qc.invalidateQueries('alerts');
      qc.invalidateQueries('alert-summary');
      toast.success('Alert resolved');
    },
    onError: () => {
      toast.error('Failed to resolve alert');
    },
  });
};
