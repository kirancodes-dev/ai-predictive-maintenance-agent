export type SensorTrend = 'stable' | 'increasing' | 'decreasing';

export interface SensorBaseline {
  mean: number;
  std: number;
  min: number;
  max: number;
  p5: number;
  p95: number;
  warningMin: number;
  warningMax: number;
  criticalMin: number;
  criticalMax: number;
  recentMean: number;
  trend: SensorTrend;
  trendPct: number;
  sampleCount: number;
  source: 'computed' | 'db_fallback';
}

export interface MachineBaseline {
  machineId: string;
  computedAt: string;
  baselineWindowReadings: number;
  recentWindowReadings: number;
  sensors: Record<string, SensorBaseline>;
  overallHealthScore: number;
}
