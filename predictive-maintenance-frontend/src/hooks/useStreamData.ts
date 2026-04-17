import { useState, useEffect, useCallback } from 'react';
import { websocketService } from '../services/websocket/websocketService';
import type { SensorReading } from '../types/sensor.types';

export const useStreamData = (machineId: string) => {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const handleSensorUpdate = useCallback((payload: unknown) => {
    const reading = payload as SensorReading;
    if (reading.machineId === machineId) {
      setReadings(prev => [...prev.slice(-299), reading]);
    }
  }, [machineId]);

  useEffect(() => {
    websocketService.connect(`/machines/${machineId}`);
    setIsConnected(true);
    websocketService.on('sensor_update', handleSensorUpdate);

    return () => {
      websocketService.off('sensor_update', handleSensorUpdate);
      websocketService.disconnect();
      setIsConnected(false);
    };
  }, [machineId, handleSensorUpdate]);

  const clearReadings = () => setReadings([]);

  return { readings, isConnected, clearReadings };
};
