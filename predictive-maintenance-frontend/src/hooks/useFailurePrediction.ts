import { useQuery } from 'react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { predictionApi, technicianApi } from '../services/api/predictionApi';
import { websocketService } from '../services/websocket/websocketService';
import type { RichPrediction, Technician } from '../types/maintenance.types';

/**
 * Combines REST polling + WebSocket push for failure predictions.
 * - Polls /predictions/live every 30 seconds
 * - Listens for WebSocket failure_prediction, pre_failure_alert, technician_assigned events
 */
export const useFailurePrediction = () => {
  const { data: predictions, isLoading, refetch } = useQuery(
    'failure-predictions-live',
    () => predictionApi.getLive().then((r) => r.data.data),
    { refetchInterval: 30_000 }
  );

  const { data: technicians } = useQuery(
    'technicians',
    () => technicianApi.getAll().then((r) => r.data.data),
    { refetchInterval: 60_000 }
  );

  const [wsEvents, setWsEvents] = useState<Array<{ type: string; payload: unknown }>>([]);

  // Listen for prediction-related WebSocket events
  useEffect(() => {
    const handler = (type: string, payload: unknown) => {
      if (['failure_prediction', 'pre_failure_alert', 'technician_assigned'].includes(type)) {
        setWsEvents((prev) => [{ type, payload }, ...prev.slice(0, 19)]);
        // Trigger a refresh when relevant events arrive
        if (type === 'pre_failure_alert' || type === 'technician_assigned') {
          refetch();
        }
      }
    };
    websocketService.on(handler);
    return () => websocketService.off(handler);
  }, [refetch]);

  return {
    predictions: predictions ?? [],
    technicians: technicians ?? [],
    isLoading,
    wsEvents,
    refetch,
  };
};

export const useAvailableTechnicians = () => {
  return useQuery(
    'available-technicians',
    () => technicianApi.getAvailable().then((r) => r.data.data),
    { refetchInterval: 30_000 }
  );
};
