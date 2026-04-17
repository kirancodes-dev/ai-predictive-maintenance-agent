import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { SENSOR_CONFIG, KNOWN_SENSOR_TYPES, type KnownSensorType } from '../../monitoring/charts/chartConfig';
import type { SensorReadingDto } from '../../../services/api/streamApi';

const MACHINE_COLORS: Record<string, string> = {
  CNC_01: '#3b82f6',
  CNC_02: '#8b5cf6',
  PUMP_03: '#06b6d4',
  CONVEYOR_04: '#f97316',
};

const MACHINE_LABELS: Record<string, string> = {
  CNC_01: 'CNC #1',
  CNC_02: 'CNC #2',
  PUMP_03: 'Pump #3',
  CONVEYOR_04: 'Conveyor #4',
};

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

const ChartTooltip = ({
  active, payload, label, unit,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  unit: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-tooltip-bg, #fff)', border: '1px solid var(--color-tooltip-border, #e2e8f0)', borderRadius: 10,
      padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 16px var(--color-card-shadow, rgba(0,0,0,0.12))',
      minWidth: 170, color: 'var(--color-text, #0f172a)',
    }}>
      <div style={{ color: 'var(--color-subtle, #94a3b8)', marginBottom: 6, fontSize: 10 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{
          display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            <span style={{ fontWeight: 600 }}>{p.name}</span>
          </span>
          <span style={{ fontWeight: 700 }}>{p.value?.toFixed(2)} {unit}</span>
        </div>
      ))}
    </div>
  );
};

const LiveSensorCharts: React.FC<Props> = ({ liveData, machineIds }) => {
  const chartData = useMemo(() => {
    const byType: Record<KnownSensorType, ChartPoint[]> = {
      temperature: [], vibration: [], rpm: [], current: [],
    };

    // Build time-bucketed data per sensor type
    for (const type of KNOWN_SENSOR_TYPES) {
      const timeMap = new Map<string, ChartPoint>();

      for (const mid of machineIds) {
        const readings = liveData[mid] ?? [];
        for (const r of readings) {
          if (r.type !== type) continue;
          const key = r.timestamp.slice(0, 19);
          if (!timeMap.has(key)) {
            timeMap.set(key, { time: r.timestamp, label: timeFmt(r.timestamp) });
          }
          const pt = timeMap.get(key)!;
          pt[mid] = r.value;
        }
      }

      byType[type] = Array.from(timeMap.values()).sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      );
    }

    return byType;
  }, [liveData, machineIds]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
            📊 Real-Time Sensor Trends
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
            All machines · auto-refresh every 5s · live API polling
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {machineIds.map((mid) => (
            <span key={mid} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: MACHINE_COLORS[mid] ?? '#666',
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: MACHINE_COLORS[mid] ?? '#888',
                display: 'inline-block',
                boxShadow: `0 0 6px ${MACHINE_COLORS[mid] ?? '#888'}60`,
              }} />
              {MACHINE_LABELS[mid] ?? mid}
            </span>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 20,
      }}>
        {KNOWN_SENSOR_TYPES.map((type) => {
          const cfg = SENSOR_CONFIG[type];
          const data = chartData[type];
          const hasData = data.length > 0;

          return (
            <div key={type} style={{
              background: 'var(--color-surface, #fff)', borderRadius: 14, padding: '18px 20px 12px',
              border: '1px solid var(--color-border, #e2e8f0)',
              boxShadow: '0 2px 8px var(--color-card-shadow, rgba(0,0,0,0.04))',
              transition: 'background 0.2s, border-color 0.2s',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{cfg.label}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>({cfg.unit})</span>
                </div>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: cfg.color,
                    display: 'inline-block', boxShadow: `0 0 6px ${cfg.color}`,
                    animation: 'pulse 2s infinite',
                  }} />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Live</span>
                </span>
              </div>

              {!hasData ? (
                <div style={{
                  height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#94a3b8', fontSize: 13,
                }}>
                  Waiting for sensor data…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" opacity={0.5} />
                    <XAxis
                      dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-subtle, #94a3b8)' }}
                      tickLine={false} axisLine={false} interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={cfg.domain} width={52}
                      tick={{ fontSize: 10, fill: 'var(--color-subtle, #94a3b8)' }} tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => `${v}${cfg.unit.length <= 3 ? cfg.unit : ''}`}
                    />
                    <Tooltip content={<ChartTooltip unit={cfg.unit} />} />
                    {machineIds.map((mid) => (
                      <Line
                        key={mid}
                        type="monotone"
                        dataKey={mid}
                        name={MACHINE_LABELS[mid] ?? mid}
                        stroke={MACHINE_COLORS[mid] ?? '#888'}
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls
                        activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Quick stats row */}
              {hasData && (
                <div style={{
                  display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8,
                  fontSize: 11, color: '#64748b',
                }}>
                  {machineIds.map((mid) => {
                    const vals = data.map((d) => d[mid] as number | undefined).filter((v): v is number => v != null);
                    if (!vals.length) return null;
                    const latest = vals[vals.length - 1];
                    const min = Math.min(...vals);
                    const max = Math.max(...vals);
                    return (
                      <span key={mid} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: MACHINE_COLORS[mid] ?? '#888',
                          display: 'inline-block',
                        }} />
                        <strong style={{ color: MACHINE_COLORS[mid] ?? '#888' }}>
                          {latest.toFixed(1)}
                        </strong>
                        <span style={{ color: '#94a3b8' }}>
                          ({min.toFixed(0)}–{max.toFixed(0)})
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
