import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { SENSOR_CONFIG, KNOWN_SENSOR_TYPES, type KnownSensorType } from '../../monitoring/charts/chartConfig';
import type { SensorReadingDto } from '../../../services/api/streamApi';

/* ── Machine colors ── */
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

/* ── ECG paper styling ── */
const ECG_PAPER = '#fef9f4';
const ECG_GRID_MINOR = '#fde2d4';
const ECG_GRID_MAJOR = '#f4b8a0';

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

/* ── Inject global ECG styles ── */
const ecgStyleId = 'ecg-paper-styles';
if (typeof document !== 'undefined' && !document.getElementById(ecgStyleId)) {
  const style = document.createElement('style');
  style.id = ecgStyleId;
  style.textContent = `
    @keyframes ecgBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    @keyframes ecgSweepLine {
      0% { left: 0%; }
      100% { left: 100%; }
    }
    .ecg-paper-card {
      position: relative;
      overflow: hidden;
    }
    .ecg-paper-card .ecg-sweep-bar {
      position: absolute;
      top: 0; bottom: 0;
      width: 3px;
      background: linear-gradient(180deg, rgba(229,56,59,0), rgba(229,56,59,0.7), rgba(229,56,59,0));
      box-shadow: 0 0 12px rgba(229,56,59,0.5), 4px 0 20px rgba(229,56,59,0.15);
      pointer-events: none;
      z-index: 5;
      animation: ecgSweepLine 8s linear infinite;
    }
    .ecg-paper-card .ecg-sweep-bar::after {
      content: '';
      position: absolute;
      top: 0; bottom: 0;
      left: 3px;
      width: 30px;
      background: linear-gradient(90deg, rgba(254,249,244,0.6), transparent);
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

/* ── Canvas-based ECG chart ── */
const EcgCanvas: React.FC<{
  data: ChartPoint[];
  machineIds: string[];
  domain: [number, number];
  unit: string;
}> = ({ data, machineIds, domain, unit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const padLeft = 48;
    const padRight = 12;
    const padTop = 8;
    const padBottom = 24;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;
    const [domMin, domMax] = domain;

    // ── Draw ECG paper grid ──
    // Minor grid (10px squares)
    ctx.strokeStyle = ECG_GRID_MINOR;
    ctx.lineWidth = 0.5;
    for (let x = padLeft; x <= w - padRight; x += 10) {
      ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, h - padBottom); ctx.stroke();
    }
    for (let y = padTop; y <= h - padBottom; y += 10) {
      ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(w - padRight, y); ctx.stroke();
    }
    // Major grid (50px squares)
    ctx.strokeStyle = ECG_GRID_MAJOR;
    ctx.lineWidth = 1;
    for (let x = padLeft; x <= w - padRight; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, h - padBottom); ctx.stroke();
    }
    for (let y = padTop; y <= h - padBottom; y += 50) {
      ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(w - padRight, y); ctx.stroke();
    }

    // ── Y-axis labels ──
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = domMin + (domMax - domMin) * (1 - i / yTicks);
      const y = padTop + (i / yTicks) * chartH;
      ctx.fillText(Math.round(val).toString(), padLeft - 6, y + 3);
    }

    // ── X-axis labels ──
    ctx.textAlign = 'center';
    if (data.length > 0) {
      const step = Math.max(1, Math.floor(data.length / 5));
      for (let i = 0; i < data.length; i += step) {
        const x = padLeft + (i / Math.max(1, data.length - 1)) * chartW;
        ctx.fillText(data[i].label, x, h - 6);
      }
    }

    // ── Draw waveforms ──
    if (data.length < 2) return;

    for (const mid of machineIds) {
      const col = MACHINE_COLORS[mid] || '#888';
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i < data.length; i++) {
        const raw = data[i][mid] as number | undefined;
        if (raw == null) continue;
        const x = padLeft + (i / (data.length - 1)) * chartW;
        const y = padTop + ((domMax - raw) / (domMax - domMin)) * chartH;
        points.push({ x, y });
      }

      if (points.length < 2) continue;

      // ── Smooth elliptic curve trace (Catmull-Rom → Cubic Bezier) ──
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      if (points.length === 2) {
        // Just two points — draw a simple line
        ctx.lineTo(points[1].x, points[1].y);
      } else {
        // Catmull-Rom spline converted to cubic bezier for smooth elliptic curves
        const tension = 0.35;
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(0, i - 1)];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(points.length - 1, i + 2)];

          const cp1x = p1.x + (p2.x - p0.x) * tension;
          const cp1y = p1.y + (p2.y - p0.y) * tension;
          const cp2x = p2.x - (p3.x - p1.x) * tension;
          const cp2y = p2.y - (p3.y - p1.y) * tension;

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      }
      ctx.stroke();

      // Second pass: thinner bright core for glow depth
      ctx.shadowBlur = 0;
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      if (points.length === 2) {
        ctx.lineTo(points[1].x, points[1].y);
      } else {
        const tension = 0.35;
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(0, i - 1)];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(points.length - 1, i + 2)];
          const cp1x = p1.x + (p2.x - p0.x) * tension;
          const cp1y = p1.y + (p2.y - p0.y) * tension;
          const cp2x = p2.x - (p3.x - p1.x) * tension;
          const cp2y = p2.y - (p3.y - p1.y) * tension;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      // Latest point: pulsing dot
      const last = points[points.length - 1];
      ctx.save();
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
      ctx.fill();
      // White center
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(last.x, last.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [data, machineIds, domain]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: 220, position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};

/* ── Main component ── */
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
          timeMap.get(key)![mid] = r.value;
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
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
            ECG Monitor · auto-refresh 5s · {machineIds.length} machines
          </p>
        </div>
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

          // Latest values for readout
          const latestValues: Record<string, number | null> = {};
          machineIds.forEach((mid) => {
            const vals = data.map((d) => d[mid] as number | undefined).filter((v): v is number => v != null);
            latestValues[mid] = vals.length ? vals[vals.length - 1] : null;
          });

          return (
            <div
              key={type}
              className="ecg-paper-card"
              style={{
                background: ECG_PAPER,
                borderRadius: 12,
                padding: '14px 16px 10px',
                border: '1px solid ' + ECG_GRID_MAJOR,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                position: 'relative',
              }}
            >
              {/* Sweep bar */}
              {hasData && <div className="ecg-sweep-bar" />}

              {/* Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 6, position: 'relative', zIndex: 2,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                  <span style={{
                    fontWeight: 700, fontSize: 13, color: '#1e293b',
                    letterSpacing: '0.03em',
                  }}>
                    {cfg.label}
                  </span>
                  <span style={{
                    fontSize: 10, color: '#94a3b8',
                    background: '#f1f5f9',
                    padding: '1px 6px',
                    borderRadius: 3,
                    fontFamily: 'monospace',
                  }}>
                    {cfg.unit}
                  </span>
                </div>

                {/* Live pulse */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#e5383b',
                    display: 'inline-block',
                    animation: 'ecgBlink 1.2s ease-in-out infinite',
                  }} />
                  <span style={{
                    fontSize: 10, color: '#e5383b', fontWeight: 700,
                    fontFamily: 'monospace', letterSpacing: '0.08em',
                  }}>
                    LIVE
                  </span>
                </div>
              </div>

              {/* Digital readout */}
              <div style={{
                display: 'flex', gap: 16, marginBottom: 4,
                position: 'relative', zIndex: 2,
              }}>
                {machineIds.map((mid) => {
                  const val = latestValues[mid];
                  const col = MACHINE_COLORS[mid] ?? '#888';
                  return (
                    <div key={mid} style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                      <span style={{
                        width: 10, height: 3, borderRadius: 1,
                        background: col, display: 'inline-block',
                      }} />
                      <span style={{
                        fontSize: 18, fontWeight: 800,
                        fontFamily: 'monospace',
                        color: val != null ? col : '#cbd5e1',
                        lineHeight: 1,
                      }}>
                        {val != null ? val.toFixed(1) : '---'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ECG Canvas Chart */}
              {!hasData ? (
                <div style={{
                  height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', zIndex: 2,
                }}>
                  <div style={{
                    color: '#cbd5e1', fontSize: 13, fontFamily: 'monospace', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 8, color: '#e5383b', opacity: 0.4 }}>
                      ── ── ── ── ──
                    </div>
                    AWAITING SIGNAL…
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <EcgCanvas
                    data={data}
                    machineIds={machineIds}
                    domain={cfg.domain as [number, number]}
                    unit={cfg.unit}
                  />
                </div>
              )}

              {/* Bottom stats */}
              {hasData && (
                <div style={{
                  display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4,
                  fontSize: 10, fontFamily: 'monospace',
                  borderTop: '1px solid ' + ECG_GRID_MAJOR + '50',
                  paddingTop: 5,
                  position: 'relative', zIndex: 2,
                  color: '#64748b',
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
                          width: 8, height: 3, borderRadius: 1,
                          background: col, display: 'inline-block',
                        }} />
                        <span>
                          MIN <strong style={{ color: col }}>{min.toFixed(1)}</strong>
                          {' '}MAX <strong style={{ color: col }}>{max.toFixed(1)}</strong>
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
