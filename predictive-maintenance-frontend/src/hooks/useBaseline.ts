import { useQuery } from 'react-query';
import { useMemo } from 'react';
import { baselineApi } from '../services/api/baselineApi';

const OVERRIDES_KEY = 'threshold_overrides';

export interface ThresholdOverride {
  warningMin: number;
  warningMax: number;
  criticalMin: number;
  criticalMax: number;
}

export type ThresholdOverrides = Partial<Record<string, Partial<Record<string, ThresholdOverride>>>>;

export function getStoredOverrides(): ThresholdOverrides {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}');
  } catch { return {}; }
}

export function saveOverride(machineId: string, sensorType: string, override: ThresholdOverride): void {
  const all = getStoredOverrides();
  if (!all[machineId]) all[machineId] = {};
  all[machineId]![sensorType] = override;
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
}

export function clearOverride(machineId: string, sensorType: string): void {
  const all = getStoredOverrides();
  if (all[machineId]) {
    delete all[machineId]![sensorType];
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
  }
}

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

  // Merge computed baseline with any manual overrides from localStorage
  const baseline = useMemo(() => {
    if (!query.data) return query.data;
    const overrides = getStoredOverrides()[machineId] ?? {};
    const merged = { ...query.data };
    if (merged.sensors && Object.keys(overrides).length > 0) {
      merged.sensors = { ...merged.sensors };
      for (const [sType, ov] of Object.entries(overrides)) {
        if (merged.sensors[sType] && ov) {
          merged.sensors[sType] = { ...merged.sensors[sType], ...ov };
        }
      }
    }
    return merged;
  }, [query.data, machineId]);

  return {
    baseline,
    isLoading: query.isLoading,
    isError: query.isError,
    overallHealth: baseline?.overallHealthScore ?? null,
    computedAt: baseline?.computedAt ?? null,
  };
};
