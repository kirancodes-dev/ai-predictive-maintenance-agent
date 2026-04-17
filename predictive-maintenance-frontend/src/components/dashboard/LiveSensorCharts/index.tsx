import React, { useMemo, useRef, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SENSOR_CONFIG, KNOWN_SENSOR_TYPES, type KnownSensorType } from '../../monitoring/charts/chartConfig';
import type { SensorReadingDto } from '../../../services/api/streamApi';

/* ── Machine colors & labels ── */
const MACHINE_COLORS: Record<string, string> = {
  CNC_01: '#e5383b',
  CNC_02: '#2563eb',
  PUMP_03: '#16a34a',
  CONVEYOR_04: '#d97706',
};

const MACHINE_LABELS: Record<string, string> = {
  CNC_01: 'CNC #1',
  CNC_02: 'CNC #2',
  PUMP_03: 'Pump #3',
  CONVEYOR_04: 'Conveyor #4',
};

const MAX_HISTORY = 60; // keep last 60 data points (~5 minutes at 5s poll)

interface Props {
  liveData: Record<string, SensorReadingDto[]>;
  machineIds: string[];
}

interface ChartPoint {
  time: string;
  label: string;
  [key: string]: number | string | undefined;
}

const timeFmt = (ts: string) => {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts.slice(11, 19);
  }
};

/* ── Custom tooltip matching monitoring screen ── */
const MultiMachineTooltip = ({
  active, payload, label, unit, machineIds,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  unit: string;
  machineIds: string[];
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface, #fff)',
      border: '1px solid var(--color-border, #e2e8f0)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      minWidth: 140,
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 6, fontSize: 11, borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
        {label}
      </div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 12, padding: '2px 0',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 10, height: 3, borderRadius: 1,
              background: entry.color, display: 'inline-block',
            }} />
            <span style={{ color: '#64748b', fontSize: 11 }}>
              {MACHINE_LABELS[entry.dataKey] ?? entry.dataKey}
            </span>
          </span>
          <span style={{ fontWeight: 700, fontSize: 13, color: entry.color }}>
            {Number(entry.value).toFixed(2)} {unit}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── Gradient definitions for area fills ── */
const GradientDefs: React.FC<{ machineIds: string[]; sensorType: string }> = ({ machineIds, sensorType }) => (
  <defs>
    {machineIds.map((mid) => (
      <linearGradient key={`${sensorType}-${mid}`} id={`grad-${sensorType}-${mid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={MACHINE_COLORS[mid] ?? '#888'} stopOpacity={0.15} />
        <stop offset="95%" stopColor={MACHINE_COLORS[mid] ?? '#888'} stopOpacity={0.01} />
      </linearGradient>
    ))}
  </defs>
);

/* ── Stats bar per machine ── */
const StatsBar: React.FC<{
  data: ChartPoint[];
  machineIds: string[];
  unit: string;
}> = ({ data, machineIds, unit }) => {
  const stats = useMemo(() => {
    const result: Record<string, { latest: number; min: number; max: number; avg: number } | null> = {};
    for (const mid of machineIds) {
      const vals = data.map((d) => d[mid] as number | undefined).filter((v): v is number => v != null);
      if (!vals.length) { result[mid] = null; continue; }
      result[mid] = {
        latest: vals[vals.length - 1],
        min: Math.min(...vals),
        max: Math.max(...vals),
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      };
    }
    return result;
  }, [data, machineIds]);

  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#666' }}>
      {machineIds.map((mid) => {
        const s = stats[mid];
        if (!s) return null;
        const col = MACHINE_COLORS[mid] ?? '#888';
        return (
          <div key={mid} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 10, height: 3, borderRadius: 1,
              background: col, display: 'inline-block',
            }} />
            <span>
              <span style={{ color: '#999', fontSize: 11 }}>Now </span>
              <strong style={{ color: col, fontSize: 14 }}>{s.latest.toFixed(1)}</strong>
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Min {s.min.toFixed(1)} · Max {s.max.toFixed(1)} · Avg {s.avg.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ── Main component ── */
const LiveSensorCharts: React.FC<Props> = ({ liveData, machineIds }) => {
  // Accumulate data points over time (each poll adds new points)
  const historyRef = useRef<Record<KnownSensorType, ChartPoint[]>>({
    temperature: [], vibration: [], rpm: [], current: [],
  });

  // Track last-seen timestamp to avoid duplicates
  const lastSeenRef = useRef<string>('');

  useEffect(() => {
    // Merge latest poll data into history buffer
    const now = new Date().toISOString();
    const nowKey = now.slice(0, 19);

    // Check if we have any new data
    const allReadings = Object.values(liveData).flat();
    if (!allReadings.length) return;

    // Use latest timestamp from the data, or current time
    const latestTs = allReadings.reduce((best, r) => r.timestamp > best ? r.timestamp : best, '');
    const tsKey = latestTs ? latestTs.slice(0, 19) : nowKey;

    // Skip if we already processed this timestamp
    if (tsKey === lastSeenRef.current) return;
    lastSeenRef.current = tsKey;

    for (const type of KNOWN_SENSOR_TYPES) {
      const point: ChartPoint = {
        time: latestTs || now,
        label: timeFmt(latestTs || now),
      };

      let hasValue = false;
      for (const mid of machineIds) {
        const readings = liveData[mid] ?? [];
        const reading = readings.find((r) => r.type === type);
        if (reading) {
          point[mid] = reading.value;
          hasValue = true;
        }
      }

      if (hasValue) {
        historyRef.current[type] = [
          ...historyRef.current[type],
          point,
        ].slice(-MAX_HISTORY);
      }
    }
  }, [liveData, machineIds]);

  // Build chart data from accumulated history
  const chartData = useMemo(() => {
    const byType: Record<KnownSensorType, ChartPoint[]> = {
      temperature: [...historyRef.current.temperature],
      vibration: [...historyRef.current.vibration],
      rpm: [...historyRef.current.rpm],
      current: [...historyRef.current.current],
    };
    return byType;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <span>Real-Time Sensor Trends</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
            Live monitoring · auto-refresh 5s · {machineIds.length} machines
          </p>
        </div>
        {/* Machine legend */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {machineIds.map((mid) => (
            <span key={mid} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 600,
              color: MACHINE_COLORS[mid] ?? '#666',
            }}>
              <span style={{
                width: 18, height: 3, borderRadius: 1,
                background: MACHINE_COLORS[mid] ?? '#888',
                display: 'inline-block',
              }} />
              {MACHINE_LABELS[mid] ?? mid}
            </span>
          ))}
        </div>
      </div>

      {/* 2×2 Chart grid — same layout as monitoring screen */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
        gap: 20,
      }}>
        {KNOWN_SENSOR_TYPES.map((type) => {
          const cfg = SENSOR_CONFIG[type];
          const data = chartData[type];
          const hasData = data.length > 0;

          return (
            <div
              key={type}
              style={{
                background: 'var(--color-surface, #fff)',
                borderRadius: 12,
                padding: '16px 20px',
                border: '1px solid var(--color-border, #e2e8f0)',
                boxShadow: '0 1px 4px var(--color-card-shadow, rgba(0,0,0,0.06))',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
            >
              {/* Card header — matches SensorChartPanel */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>({cfg.unit})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: hasData ? '#22c55e' : '#94a3b8',
                    display: 'inline-block',
                    boxShadow: hasData ? '0 0 8px #22c55e80' : 'none',
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: hasData ? '#16a34a' : '#94a3b8' }}>
                    {hasData ? 'Streaming' : 'Waiting'}
                  </span>
                  {hasData && (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{data.length} pts</span>
                  )}
                </div>
              </div>

              {/* Stats bar */}
              {hasData && <StatsBar data={data} machineIds={machineIds} unit={cfg.unit} />}

              {/* Chart */}
              {!hasData ? (
                <div style={{
                  height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#94a3b8', fontSize: 13,
                }}>
                  Waiting for data…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <GradientDefs machineIds={machineIds} sensorType={type} />
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border, #e2e8f0)"
                      opacity={0.6}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'var(--color-subtle, #94a3b8)' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={cfg.domain as [number, number]}
                      width={48}
                      tick={{ fontSize: 10, fill: 'var(--color-subtle, #94a3b8)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v}${cfg.unit.length <= 3 ? cfg.unit : ''}`}
                    />
                    <Tooltip
                      content={
                        <MultiMachineTooltip unit={cfg.unit} machineIds={machineIds} />
                      }
                    />
                    {machineIds.map((mid) => (
                      <Line
                        key={mid}
                        type="monotone"
                        dataKey={mid}
                        stroke={MACHINE_COLORS[mid] ?? '#888'}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 5,
                          stroke: MACHINE_COLORS[mid] ?? '#888',
                          strokeWidth: 2,
                          fill: '#fff',
                        }}
                        isAnimationActive={false}
                        name={MACHINE_LABELS[mid] ?? mid}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Bottom min/max per machine */}
              {hasData && (
                <div style={{
                  display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11,
                  borderTop: '1px solid var(--color-border, #e2e8f0)',
                  paddingTop: 8, color: '#94a3b8',
                }}>
                  {machineIds.map((mid) => {
                    const vals = data.map((d) => d[mid] as number | undefined).filter((v): v is number => v != null);
                    if (!vals.length) return null;
                    const min = Math.min(...vals);
                    const max = Math.max(...vals);
                    const col = MACHINE_COLORS[mid] ?? '#888';
                    return (
                      <span key={mid} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          width: 10, height: 3, borderRadius: 1,
                          background: col, display: 'inline-block',
                        }} />
                        <span>
                          {MACHINE_LABELS[mid]}: Min <strong style={{ color: col }}>{min.toFixed(1)}</strong>
                          {' · '}Max <strong style={{ color: col }}>{max.toFixed(1)}</strong>
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveSensorCharts;
