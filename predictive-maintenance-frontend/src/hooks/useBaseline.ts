import { useQuery } from 'react-query';
import { baselineApi } from '../services/api/baselineApi';

export const useBaseline = (machineId: string) => {
  const query = useQuery(
    ['baseline', machineId],
    () => baselineApi.getBaseline(machineId).then((r) => r.data.data),
    {
      enabled: !!machineId,
      staleTime: 10 * 60 * 1000,
      cacheTime: 20 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  );

  return {
    baseline: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    overallHealth: query.data?.overallHealthScore ?? null,
    computedAt: query.data?.computedAt ?? null,
  };
};
