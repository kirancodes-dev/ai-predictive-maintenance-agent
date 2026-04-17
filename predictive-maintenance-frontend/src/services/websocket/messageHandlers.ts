import type { SensorReading } from '../../types/sensor.types';
import type { Alert } from '../../types/alert.types';

export type WebSocketMessage =
  | { type: 'sensor_update'; payload: SensorReading }
  | { type: 'alert'; payload: Alert }
  | { type: 'machine_status'; payload: { machineId: string; status: string } }
  | { type: 'ping'; payload: null };

export const parseSensorUpdate = (payload: unknown): SensorReading => {
  return payload as SensorReading;
};

export const parseAlertMessage = (payload: unknown): Alert => {
  return payload as Alert;
};
