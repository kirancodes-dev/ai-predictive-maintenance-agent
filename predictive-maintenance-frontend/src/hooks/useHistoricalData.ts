import { useQuery } from 'react-query';
import { streamApi } from '../services/api/streamApi';
import type { DateRangeParams } from '../types/api.types';

export const useHistoricalData = (machineId: string, range: DateRangeParams) => {
  return useQuery(
    ['history', machineId, range],
    () => streamApi.getHistory(machineId, range).then(r => r.data.data),
    {
      enabled: !!machineId && !!range.from && !!range.to,
      staleTime: 60000,
    }
  );
};
