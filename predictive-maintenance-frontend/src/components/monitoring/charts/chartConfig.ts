export const SENSOR_CONFIG = {
  temperature: {
    label: 'Temperature',
    unit: '°C',
    color: '#ef4444',
    gradientId: 'grad-temp',
    icon: '🌡️',
    domain: [40, 110] as [number, number],
    defaultWarningMin: 65,
    defaultWarningMax: 85,
    defaultCriticalMin: 55,
    defaultCriticalMax: 95,
  },
  vibration: {
    label: 'Vibration',
    unit: 'mm/s',
    color: '#f59e0b',
    gradientId: 'grad-vib',
    icon: '📳',
    domain: [0, 7] as [number, number],
    defaultWarningMin: 0.5,
    defaultWarningMax: 4.0,
    defaultCriticalMin: 0.1,
    defaultCriticalMax: 5.5,
  },
  rpm: {
    label: 'RPM',
    unit: 'RPM',
    color: '#3b82f6',
    gradientId: 'grad-rpm',
    icon: '🔄',
    domain: [800, 2200] as [number, number],
    defaultWarningMin: 1100,
    defaultWarningMax: 1900,
    defaultCriticalMin: 900,
    defaultCriticalMax: 2100,
  },
  current: {
    label: 'Current',
    unit: 'A',
    color: '#10b981',
    gradientId: 'grad-current',
    icon: '⚡',
    domain: [4, 28] as [number, number],
    defaultWarningMin: 8,
    defaultWarningMax: 21,
    defaultCriticalMin: 6,
    defaultCriticalMax: 25,
  },
} as const;

export type KnownSensorType = keyof typeof SENSOR_CONFIG;

export const KNOWN_SENSOR_TYPES: KnownSensorType[] = [
  'temperature',
  'vibration',
  'rpm',
  'current',
];

export interface SensorChartPoint {
  timestamp: string;
  value: number;
  isAnomaly?: boolean;
}

export interface SensorThresholds {
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
}

/** Combined point — one entry per SSE tick, one key per sensor type */
export interface CombinedDataPoint {
  timestamp: string;
  temperature?: number;
  vibration?: number;
  rpm?: number;
  current?: number;
  /** Normalised 0-100 values for the combined chart */
  temperature_pct?: number;
  vibration_pct?: number;
  rpm_pct?: number;
  current_pct?: number;
}

/** Normalise an absolute sensor value to 0-100% of its display domain */
export function normalizeValue(type: KnownSensorType, value: number): number {
  const [dMin, dMax] = SENSOR_CONFIG[type].domain;
  return Math.max(0, Math.min(100, ((value - dMin) / (dMax - dMin)) * 100));
}

/** Parse sensor type from an id like "CNC_01_temperature" */
export function getSensorTypeFromId(sensorId: string): KnownSensorType | null {
  const last = sensorId.toLowerCase().split('_').at(-1) as KnownSensorType;
  return KNOWN_SENSOR_TYPES.includes(last) ? last : null;
}

/** Build combined data from a flat SensorReading array (live mode) */
export function buildCombinedLiveData(
  readings: Array<{ type: string; value: number; timestamp: string; isAnomaly: boolean }>,
): CombinedDataPoint[] {
  const bySecond = new Map<string, CombinedDataPoint>();

  for (const r of readings) {
    const type = r.type as KnownSensorType;
    if (!KNOWN_SENSOR_TYPES.includes(type)) continue;
    const key = r.timestamp.slice(0, 19); // group by second
    if (!bySecond.has(key)) bySecond.set(key, { timestamp: r.timestamp });
    const point = bySecond.get(key)!;
    point[type] = r.value;
    point[`${type}_pct` as keyof CombinedDataPoint] = normalizeValue(type, r.value) as never;
  }

  return Array.from(bySecond.values());
}

/** Build combined data from SensorHistory[] (history mode) */
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
        point[`${type}_pct` as keyof CombinedDataPoint] = normalizeValue(
          type,
          data[i].value,
        ) as never;
      }
    });
    if (point.timestamp) result.push(point);
  }
  return result;
}

/** Thin the data array to at most `maxPoints` evenly spaced entries */
export function thinData<T>(data: T[], maxPoints = 300): T[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}
