import { useQuery } from 'react-query';
import { baselineApi } from '../services/api/baselineApi';
import type { SensorBaseline } from '../types/baseline.types';
import type { KnownSensorType } from '../components/monitoring/charts/chartConfig';

export const useBaseline = (machineId: string) => {
  const query = useQuery(
    ['baseline', machineId],
    () => baselineApi.getBaseline(machineId).then((r) => r.data.data),
    {
      enabled: !!machineId,
      staleTime: 10 * 60 * 1000,  // treat as fresh for 10 minutes
      cacheTime: 20 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  );

  /** Return thresholds for a given sensor type, or undefined while loading */
  const getThresholds = (type: KnownSensorType): SensorBaseline | undefined =>
    query.data?.sensors[type];

  return {
    baseline: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    getThresholds,
    overallHealth: query.data?.overallHealthScore ?? null,
    computedAt: query.data?.computedAt ?? null,
  };
};
