export const SENSOR_CONFIG = {
  temperature: {
    label: 'Temperature',
    unit: '°C',
    color: '#ef4444',
    gradientId: 'grad-temp',
    icon: '🌡️',
    domain: [40, 120] as [number, number],
  },
  vibration: {
    label: 'Vibration',
    unit: 'mm/s',
    color: '#f59e0b',
    gradientId: 'grad-vib',
    icon: '📳',
    domain: [0, 8] as [number, number],
  },
  rpm: {
    label: 'RPM',
    unit: 'RPM',
    color: '#3b82f6',
    gradientId: 'grad-rpm',
    icon: '🔄',
    domain: [800, 2200] as [number, number],
  },
  current: {
    label: 'Current',
    unit: 'A',
    color: '#10b981',
    gradientId: 'grad-current',
    icon: '⚡',
    domain: [4, 28] as [number, number],
  },
} as const;

export type KnownSensorType = keyof typeof SENSOR_CONFIG;

export const KNOWN_SENSOR_TYPES: KnownSensorType[] = ['temperature', 'vibration', 'rpm', 'current'];

export interface SensorChartPoint {
  timestamp: string;
  value: number;
  isAnomaly?: boolean;
}

export interface SensorThresholds {
  warningMin: number;
  warningMax: number;
  criticalMin: number;
  criticalMax: number;
  mean: number;
  trend: 'stable' | 'increasing' | 'decreasing';
  trendPct: number;
}

export interface CombinedDataPoint {
  timestamp: string;
  temperature?: number;
  vibration?: number;
  rpm?: number;
  current?: number;
  temperature_pct?: number;
  vibration_pct?: number;
  rpm_pct?: number;
  current_pct?: number;
  [key: string]: number | string | undefined;
}

export function normalizeValue(type: KnownSensorType, value: number): number {
  const [dMin, dMax] = SENSOR_CONFIG[type].domain;
  // Use a wider spread: map domain to 10–90% so differences are more visible
  const raw = (value - dMin) / (dMax - dMin);
  return Math.max(0, Math.min(100, 10 + raw * 80));
}

export function getSensorTypeFromId(sensorId: string): KnownSensorType | null {
  const parts = sensorId.toLowerCase().split('_');
  const last = parts[parts.length - 1] as KnownSensorType;
  return KNOWN_SENSOR_TYPES.includes(last) ? last : null;
}

export function buildCombinedLiveData(
  readings: Array<{ type: string; value: number; timestamp: string; isAnomaly: boolean }>,
): CombinedDataPoint[] {
  const bySecond = new Map<string, CombinedDataPoint>();
  for (const r of readings) {
    const type = r.type as KnownSensorType;
    if (!KNOWN_SENSOR_TYPES.includes(type)) continue;
    const key = r.timestamp.slice(0, 19);
    if (!bySecond.has(key)) bySecond.set(key, { timestamp: r.timestamp });
    const point = bySecond.get(key)!;
    point[type] = r.value;
    (point as Record<string, unknown>)[`${type}_pct`] = normalizeValue(type, r.value);
  }
  return Array.from(bySecond.values());
}

export function buildCombinedHistoryData(
  histories: Array<{ sensorId: string; data: Array<{ timestamp: string; value: number }> }>,
): CombinedDataPoint[] {
  if (!histories.length) return [];
  const typeMap = new Map<KnownSensorType, Array<{ timestamp: string; value: number }>>();
  for (const h of histories) {
    const type = getSensorTypeFromId(h.sensorId);
    if (type) typeMap.set(type, h.data);
  }
  const maxLen = Math.max(...[...typeMap.values()].map((d) => d.length), 0);
  const result: CombinedDataPoint[] = [];
  for (let i = 0; i < maxLen; i++) {
    const point: CombinedDataPoint = { timestamp: '' };
    typeMap.forEach((data, type) => {
      if (data[i]) {
        point.timestamp = data[i].timestamp;
        point[type] = data[i].value;
        (point as Record<string, unknown>)[`${type}_pct`] = normalizeValue(type, data[i].value);
      }
    });
    if (point.timestamp) result.push(point);
  }
  return result;
}

export function thinData<T>(data: T[], maxPoints = 300): T[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}
