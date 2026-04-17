export type SensorType =
  | 'temperature'
  | 'vibration'
  | 'pressure'
  | 'humidity'
  | 'current'
  | 'voltage'
  | 'rpm'
  | 'flow';

export interface SensorReading {
  sensorId: string;
  machineId: string;
  type: SensorType;
  value: number;
  unit: string;
  timestamp: string;
  isAnomaly: boolean;
}

export interface Sensor {
  id: string;
  machineId: string;
  name: string;
  type: SensorType;
  unit: string;
  minThreshold: number;
  maxThreshold: number;
  criticalMin: number;
  criticalMax: number;
  isActive: boolean;
}

export interface SensorDataPoint {
  timestamp: string;
  value: number;
}

export interface SensorHistory {
  sensorId: string;
  data: SensorDataPoint[];
}
