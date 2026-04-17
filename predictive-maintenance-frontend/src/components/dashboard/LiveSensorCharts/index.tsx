import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SENSOR_CONFIG, KNOWN_SENSOR_TYPES, type KnownSensorType } from '../../monitoring/charts/chartConfig';
import type { SensorReadingDto } from '../../../services/api/streamApi';

/* ── ECG‑style neon palette per machine ── */
const MACHINE_COLORS: Record<string, string> = {
  CNC_01: '#00ff87',   // neon green
  CNC_02: '#00d4ff',   // cyan
  PUMP_03: '#ff6b6b',  // coral red
  CONVEYOR_04: '#ffbe0b', // amber
};

const MACHINE_LABELS: Record<string, string> = {
  CNC_01: 'CNC #1',
  CNC_02: 'CNC #2',
  PUMP_03: 'Pump #3',
  CONVEYOR_04: 'Conveyor #4',
};

/* ── ECG monitor background ── */
const ECG_BG = '#0a0e17';
const ECG_GRID = '#1a2332';
const ECG_GRID_MAJOR = '#1e3a2a';
const ECG_TEXT = '#4a6a5a';

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

/* ── ECG‑style tooltip ── */
const EcgTooltip = ({
  active, payload, label, unit,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  unit: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10, 14, 23, 0.95)',
      border: '1px solid #00ff8740',
      borderRadius: 6,
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: '0 0 20px rgba(0, 255, 135, 0.15)',
      minWidth: 170,
      color: '#c0d0c0',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ color: '#4a6a5a', marginBottom: 6, fontSize: 10, fontFamily: 'monospace' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{
          display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8, height: 3, borderRadius: 1,
              background: p.color,
              display: 'inline-block',
              boxShadow: `0 0 6px ${p.color}`,
            }} />
            <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: 11 }}>{p.name}</span>
          </span>
          <span style={{
            fontWeight: 700, fontFamily: 'monospace', fontSize: 12,
            color: p.color,
            textShadow: `0 0 8px ${p.color}60`,
          }}>
            {p.value?.toFixed(2)} {unit}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── ECG CSS injected once ── */
const ecgStyleId = 'ecg-chart-styles';
if (typeof document !== 'undefined' && !document.getElementById(ecgStyleId)) {
  const style = document.createElement('style');
  style.id = ecgStyleId;
  style.textContent = `
    @keyframes ecgPulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor; }
      50% { opacity: 0.4; box-shadow: 0 0 2px currentColor; }
    }
    @keyframes ecgSweep {
      0% { opacity: 0.3; }
      50% { opacity: 1; }
      100% { opacity: 0.3; }
    }
    @keyframes ecgFlatline {
      0% { width: 0%; }
      100% { width: 100%; }
    }
    .ecg-monitor-card {
      position: relative;
      overflow: hidden;
    }
    .ecg-monitor-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: 
        repeating-linear-gradient(0deg, transparent, transparent 19px, ${ECG_GRID}33 19px, ${ECG_GRID}33 20px),
        repeating-linear-gradient(90deg, transparent, transparent 19px, ${ECG_GRID}33 19px, ${ECG_GRID}33 20px);
      pointer-events: none;
      z-index: 0;
      border-radius: 12px;
    }
    .ecg-monitor-card::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, #00ff8730, transparent);
      z-index: 1;
      pointer-events: none;
    }
    .ecg-monitor-card .recharts-cartesian-grid-horizontal line,
    .ecg-monitor-card .recharts-cartesian-grid-vertical line {
      stroke: ${ECG_GRID} !important;
      stroke-opacity: 0.6 !important;
    }
    .ecg-flatline {
      position: absolute;
      bottom: 50%;
      left: 0;
      height: 2px;
      background: linear-gradient(90deg, #00ff8700, #00ff8730, #00ff8700);
      animation: ecgFlatline 3s ease-in-out infinite alternate;
      pointer-events: none;
      z-index: 1;
    }
  `;
  document.head.appendChild(style);
}

const LiveSensorCharts: React.FC<Props> = ({ liveData, machineIds }) => {
  const chartData = useMemo(() => {
    const byType: Record<KnownSensorType, ChartPoint[]> = {
      temperature: [], vibration: [], rpm: [], current: [],
    };

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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>💓</span>
            <span>Real-Time Sensor Trends</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#4a6a5a', fontFamily: 'monospace' }}>
            LIVE MONITORING · auto-refresh 5s · {machineIds.length} machines
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {machineIds.map((mid) => (
            <span key={mid} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 600,
              color: MACHINE_COLORS[mid] ?? '#666',
              fontFamily: 'monospace',
              textShadow: `0 0 10px ${MACHINE_COLORS[mid] ?? '#666'}50`,
            }}>
              <span style={{
                width: 8, height: 3, borderRadius: 1,
                background: MACHINE_COLORS[mid] ?? '#888',
                display: 'inline-block',
                boxShadow: `0 0 8px ${MACHINE_COLORS[mid] ?? '#888'}`,
              }} />
              {MACHINE_LABELS[mid] ?? mid}
            </span>
          ))}
        </div>
      </div>

      {/* Chart grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
      }}>
        {KNOWN_SENSOR_TYPES.map((type) => {
          const cfg = SENSOR_CONFIG[type];
          const data = chartData[type];
          const hasData = data.length > 0;

          // Get latest values for the digital readout
          const latestValues: Record<string, number | null> = {};
          machineIds.forEach((mid) => {
            const vals = data.map((d) => d[mid] as number | undefined).filter((v): v is number => v != null);
            latestValues[mid] = vals.length ? vals[vals.length - 1] : null;
          });

          return (
            <div
              key={type}
              className="ecg-monitor-card"
              style={{
                background: ECG_BG,
                borderRadius: 12,
                padding: '14px 16px 10px',
                border: `1px solid ${ECG_GRID}`,
                boxShadow: '0 0 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.02)',
                position: 'relative',
              }}
            >
              {/* Monitor header bar */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 8, position: 'relative', zIndex: 2,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                  <span style={{
                    fontWeight: 700, fontSize: 13, color: '#c0d0c0',
                    fontFamily: 'monospace', letterSpacing: '0.05em',
                  }}>
                    {cfg.label.toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: 10, color: ECG_TEXT,
                    fontFamily: 'monospace',
                    background: '#1a2332',
                    padding: '1px 6px',
                    borderRadius: 3,
                  }}>
                    {cfg.unit}
                  </span>
                </div>

                {/* Live indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#00ff87',
                    display: 'inline-block',
                    animation: 'ecgPulse 1.5s ease-in-out infinite',
                    color: '#00ff87',
                  }} />
                  <span style={{
                    fontSize: 10, color: '#00ff87', fontFamily: 'monospace',
                    fontWeight: 700, letterSpacing: '0.1em',
                  }}>
                    LIVE
                  </span>
                </div>
              </div>

              {/* Digital readout row */}
              <div style={{
                display: 'flex', gap: 12, marginBottom: 4,
                position: 'relative', zIndex: 2,
              }}>
                {machineIds.map((mid) => {
                  const val = latestValues[mid];
                  const col = MACHINE_COLORS[mid] ?? '#888';
                  return (
                    <div key={mid} style={{
                      display: 'flex', alignItems: 'baseline', gap: 4,
                    }}>
                      <span style={{
                        fontSize: 20, fontWeight: 800,
                        fontFamily: 'monospace',
                        color: val != null ? col : '#2a3a32',
                        textShadow: val != null ? `0 0 12px ${col}80` : 'none',
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                      }}>
                        {val != null ? val.toFixed(1) : '---'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ECG Chart */}
              {!hasData ? (
                <div style={{
                  height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', zIndex: 2,
                }}>
                  <div style={{
                    color: '#2a3a32', fontSize: 13, fontFamily: 'monospace',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>⏤⏤⏤</div>
                    AWAITING SIGNAL…
                  </div>
                  <div className="ecg-flatline" />
                </div>
              ) : (
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data} margin={{ top: 4, right: 8, left: -4, bottom: 2 }}>
                      <CartesianGrid
                        strokeDasharray=""
                        stroke={ECG_GRID}
                        opacity={0.5}
                        horizontalCoordinatesGenerator={({ height }: { height: number }) =>
                          Array.from({ length: Math.floor(height / 20) }, (_, i) => i * 20)
                        }
                        verticalCoordinatesGenerator={({ width }: { width: number }) =>
                          Array.from({ length: Math.floor(width / 20) }, (_, i) => i * 20)
                        }
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9, fill: ECG_TEXT, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={{ stroke: ECG_GRID, strokeWidth: 1 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={cfg.domain} width={48}
                        tick={{ fontSize: 9, fill: ECG_TEXT, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={{ stroke: ECG_GRID, strokeWidth: 1 }}
                        tickFormatter={(v: number) => `${v}`}
                      />
                      <Tooltip content={<EcgTooltip unit={cfg.unit} />} />
                      {machineIds.map((mid) => {
                        const col = MACHINE_COLORS[mid] ?? '#888';
                        return (
                          <Line
                            key={mid}
                            type="monotone"
                            dataKey={mid}
                            name={MACHINE_LABELS[mid] ?? mid}
                            stroke={col}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                            connectNulls
                            activeDot={{
                              r: 4, strokeWidth: 2,
                              fill: ECG_BG,
                              stroke: col,
                              style: { filter: `drop-shadow(0 0 6px ${col})` },
                            }}
                            style={{ filter: `drop-shadow(0 0 4px ${col}80)` }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Bottom stats strip */}
              {hasData && (
                <div style={{
                  display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4,
                  fontSize: 10, fontFamily: 'monospace',
                  borderTop: `1px solid ${ECG_GRID}`,
                  paddingTop: 6,
                  position: 'relative', zIndex: 2,
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
                          width: 6, height: 2, borderRadius: 1,
                          background: col,
                          display: 'inline-block',
                          boxShadow: `0 0 4px ${col}`,
                        }} />
                        <span style={{ color: '#4a6a5a' }}>
                          MIN <span style={{ color: col }}>{min.toFixed(1)}</span>
                          {' '}MAX <span style={{ color: col }}>{max.toFixed(1)}</span>
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
