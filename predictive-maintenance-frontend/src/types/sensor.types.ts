export interface SensorReading {
  sensorId: string;
  machineId: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
  isAnomaly: boolean;
}

export interface SensorDataPoint {
  timestamp: string;
  value: number;
}

export interface SensorHistory {
  sensorId: string;
  machineId: string;
  type: string;
  unit: string;
  data: SensorDataPoint[];
}

export interface SensorBaseline {
  mean: number;
  stdev: number;
  warningMin: number;
  warningMax: number;
  criticalMin: number;
  criticalMax: number;
  trend: 'stable' | 'increasing' | 'decreasing';
  trendPct: number;
}

export type BaselineMap = Record<string, SensorBaseline>;
