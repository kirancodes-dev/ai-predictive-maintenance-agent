import { useQuery } from 'react-query';
import { streamApi } from '../services/api/streamApi';

interface DateRange {
  from: string;
  to: string;
}

export const useHistoricalData = (machineId: string, range: DateRange) => {
  return useQuery(
    ['history', machineId, range.from, range.to],
    () => streamApi.getHistory(machineId, range.from, range.to).then((r) => r.data.data),
    {
      enabled: !!machineId && !!range.from && !!range.to,
      staleTime: 2 * 60 * 1000,
      retry: 1,
    },
  );
};
