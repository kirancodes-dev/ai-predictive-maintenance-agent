import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { SENSOR_CONFIG, KNOWN_SENSOR_TYPES, type CombinedDataPoint, thinData } from './chartConfig';

type ViewMode = 'normalized' | 'raw';

interface CombinedChartProps {
  data: CombinedDataPoint[];
  mode: 'live' | 'history';
  height?: number;
  showBrush?: boolean;
  isLoading?: boolean;
}

/* ── Tooltip ── */
const CombinedTooltip = ({
  active, payload, label, viewMode,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  viewMode: ViewMode;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface, #fff)',
      border: '1.5px solid var(--color-border, #e2e8f0)',
      borderRadius: 10, padding: '10px 14px', fontSize: 11,
      boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
      minWidth: 170, color: 'var(--color-text, #0f172a)',
    }}>
      <div style={{ color: 'var(--color-subtle, #888)', marginBottom: 8, fontSize: 10 }}>{label}</div>
      {payload.map((p) => {
        const pct = viewMode === 'normalized' ? p.value : null;
        const status = pct === null ? null : pct >= 80 ? '🔴' : pct >= 60 ? '🟡' : '🟢';
        const cfg = KNOWN_SENSOR_TYPES.map((t) => SENSOR_CONFIG[t]).find(
          (c) => c.color === p.color,
        );
        return (
          <div key={p.dataKey} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 12, marginBottom: 4,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
              <span style={{ color: p.color, fontWeight: 600 }}>{p.name}</span>
            </span>
            <span style={{ fontWeight: 700 }}>
              {status}{' '}
              {viewMode === 'normalized'
                ? `${p.value.toFixed(1)}%`
                : `${p.value.toFixed(2)}${cfg?.unit ?? ''}`}
            </span>
          </div>
        );
      })}
      {viewMode === 'normalized' && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #f0f0f0', fontSize: 10, color: '#aaa' }}>
          🟢 &lt;60% Normal · 🟡 60–80% Warn · 🔴 &gt;80% Critical
        </div>
      )}
    </div>
  );
};

/* ── Current value pill per sensor ── */
const SensorPill = ({ type, latestPct, latestRaw }: {
  type: typeof KNOWN_SENSOR_TYPES[number];
  latestPct: number | undefined;
  latestRaw: number | undefined;
}) => {
  const cfg = SENSOR_CONFIG[type];
  if (latestRaw === undefined) return null;
  const pct = latestPct ?? 0;
  const statusColor = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : cfg.color;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: `${statusColor}12`,
      border: `1.5px solid ${statusColor}40`,
      borderRadius: 10, padding: '6px 12px', minWidth: 70,
    }}>
      <span style={{ fontSize: 14 }}>{cfg.icon}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: statusColor, lineHeight: 1.2 }}>
        {latestRaw.toFixed(1)}
      </span>
      <span style={{ fontSize: 9, color: '#94a3b8' }}>{cfg.unit}</span>
    </div>
  );
};

/* ── Main component ── */
export const CombinedChartPanel: React.FC<CombinedChartProps> = ({
  data, mode, height = 320, isLoading = false,
}) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('normalized');
  const displayData = useMemo(() => thinData(data, 300), [data]);

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // Latest values for current-reading pills
  const latest = useMemo(() => {
    if (!displayData.length) return null;
    return displayData[displayData.length - 1];
  }, [displayData]);

  // Vertical spike bands — timestamps where any sensor crosses critical (80% normalized)
  const spikeBands = useMemo(() => {
    if (viewMode !== 'normalized') return [];
    const bands: Array<{ x1: string; x2: string }> = [];
    let start: string | null = null;
    for (let i = 0; i < displayData.length; i++) {
      const pt = displayData[i];
      const anyCritical = KNOWN_SENSOR_TYPES.some(
        (t) => !hidden.has(t) && ((pt[`${t}_pct`] as number) ?? 0) >= 80,
      );
      const next = displayData[i + 1];
      if (anyCritical && !start) start = displayData[Math.max(0, i - 1)].timestamp;
      if (start && (!anyCritical || !next)) {
        bands.push({ x1: start, x2: next?.timestamp ?? pt.timestamp });
        start = null;
      }
    }
    return bands;
  }, [displayData, viewMode, hidden]);

  const tickFmt = (ts: string) => {
    try {
      const d = new Date(ts);
      return mode === 'live'
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
          d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ts.slice(11, 16); }
  };

  if (isLoading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#94a3b8', fontSize: 13 }}>
        <span style={{ animation: 'spin 1s linear infinite', marginRight: 8, display: 'inline-block' }}>⟳</span>
        Loading sensor data…
      </div>
    );
  }

  if (!displayData.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#94a3b8', fontSize: 13 }}>
        Waiting for data…
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-surface, #fff)', borderRadius: 14,
      padding: '18px 22px 14px',
      border: `1.5px solid ${spikeBands.length > 0 ? '#fca5a5' : 'var(--color-border, #e2e8f0)'}`,
      boxShadow: spikeBands.length > 0
        ? '0 0 0 3px rgba(239,68,68,0.07), 0 4px 16px rgba(0,0,0,0.06)'
        : '0 2px 8px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 14,
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            Combined Sensor View
            {spikeBands.length > 0 && (
              <span style={{ marginLeft: 10, fontSize: 11, background: '#fee2e2', color: '#ef4444',
                             borderRadius: 20, padding: '2px 10px', fontWeight: 700,
                             animation: 'pulse-critical 2s infinite' }}>
                ⚡ {spikeBands.length} critical spike{spikeBands.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-muted, #94a3b8)', marginTop: 2 }}>
            {viewMode === 'normalized'
              ? 'All sensors scaled 0–100% of their operating range for comparison'
              : 'Raw sensor values — note: each sensor uses a different scale'}
          </div>
        </div>

        {/* View mode toggle */}
        <div style={{
          display: 'flex', borderRadius: 8, overflow: 'hidden',
          border: '1.5px solid var(--color-border, #e2e8f0)',
        }}>
          {(['normalized', 'raw'] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setViewMode(m)} style={{
              padding: '4px 12px', fontSize: 11, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: viewMode === m ? 'var(--color-primary, #3b82f6)' : 'transparent',
              color: viewMode === m ? '#fff' : 'var(--color-muted, #94a3b8)',
              transition: 'all 0.15s',
            }}>
              {m === 'normalized' ? '% Scale' : 'Raw'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Live current-value pills ── */}
      {mode === 'live' && latest && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {KNOWN_SENSOR_TYPES.map((t) => (
            <SensorPill
              key={t} type={t}
              latestPct={latest[`${t}_pct`] as number | undefined}
              latestRaw={latest[t] as number | undefined}
            />
          ))}
        </div>
      )}

      {/* ── Sensor toggle buttons ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {KNOWN_SENSOR_TYPES.map((t) => {
          const cfg = SENSOR_CONFIG[t];
          const isHidden = hidden.has(t);
          const pct = latest ? (latest[`${t}_pct`] as number ?? 0) : 0;
          const statusColor = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : cfg.color;
          return (
            <button
              key={t}
              onClick={() => toggle(t)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                borderRadius: 20,
                border: `1.5px solid ${isHidden ? 'var(--color-border, #e2e8f0)' : statusColor}`,
                background: isHidden ? 'transparent' : `${statusColor}15`,
                color: isHidden ? 'var(--color-muted, #94a3b8)' : statusColor,
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
                transition: 'all 0.15s',
                opacity: isHidden ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 13 }}>{cfg.icon}</span>
              {cfg.label}
              {!isHidden && pct >= 80 && <span style={{ fontSize: 10 }}>🔴</span>}
              {!isHidden && pct >= 60 && pct < 80 && <span style={{ fontSize: 10 }}>🟡</span>}
            </button>
          );
        })}
      </div>

      {/* ── Chart ── */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={displayData} margin={{ top: 12, right: 20, left: 0, bottom: 6 }}>
          <defs>
            {KNOWN_SENSOR_TYPES.map((t) => {
              const pct = latest ? (latest[`${t}_pct`] as number ?? 0) : 0;
              const c = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : SENSOR_CONFIG[t].color;
              return (
                <linearGradient key={t} id={`combined-grad-${t}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.3} />
                  <stop offset="70%" stopColor={c} stopOpacity={0.04} />
                  <stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" opacity={0.5} vertical={false} />
          <XAxis
            dataKey="timestamp" tickFormatter={tickFmt}
            tick={{ fontSize: 10, fill: 'var(--color-subtle, #94a3b8)' }}
            tickLine={false} axisLine={false} interval="preserveStartEnd"
          />
          {viewMode === 'normalized' ? (
            <YAxis
              domain={[0, 100]} width={44}
              tick={{ fontSize: 10, fill: 'var(--color-subtle, #94a3b8)' }}
              tickLine={false} axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
          ) : (
            <YAxis
              width={50}
              tick={{ fontSize: 10, fill: 'var(--color-subtle, #94a3b8)' }}
              tickLine={false} axisLine={false}
            />
          )}

          <Tooltip content={<CombinedTooltip viewMode={viewMode} />} />

          {/* Zone bands for normalized view */}
          {viewMode === 'normalized' && (
            <>
              <ReferenceArea y1={60} y2={80} fill="#f59e0b" fillOpacity={0.06} />
              <ReferenceArea y1={80} y2={100} fill="#ef4444" fillOpacity={0.08} />
              <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value: '⚠ Warn 60%', position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }} />
              <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={2}
                label={{ value: '🔴 Critical 80%', position: 'insideTopLeft', fontSize: 10, fill: '#ef4444' }} />
            </>
          )}

          {/* Vertical spike bands */}
          {spikeBands.map((band, i) => (
            <ReferenceArea
              key={i} x1={band.x1} x2={band.x2}
              fill="#ef4444" fillOpacity={0.1}
              stroke="#ef4444" strokeOpacity={0.25} strokeWidth={1}
            />
          ))}

          {/* One area per sensor */}
          {KNOWN_SENSOR_TYPES.map((t) => {
            if (hidden.has(t)) return null;
            const cfg = SENSOR_CONFIG[t];
            const pct = latest ? (latest[`${t}_pct`] as number ?? 0) : 0;
            const strokeColor = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : cfg.color;
            const dataKey = viewMode === 'normalized' ? `${t}_pct` : t;
            return (
              <Area
                key={t}
                type="monotone"
                dataKey={dataKey}
                name={cfg.label}
                stroke={strokeColor}
                strokeWidth={2.5}
                fill={`url(#combined-grad-${t})`}
                dot={false}
                activeDot={{ r: 5, stroke: strokeColor, strokeWidth: 2, fill: '#fff' }}
                isAnimationActive={mode !== 'live'}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>

      {/* ── Zone legend ── */}
      {viewMode === 'normalized' && (
        <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#94a3b8', flexWrap: 'wrap' }}>
          <span><span style={{ color: '#10b981', fontWeight: 700 }}>●</span> 0–60% Normal operating range</span>
          <span><span style={{ color: '#f59e0b', fontWeight: 700 }}>●</span> 60–80% Warning zone</span>
          <span><span style={{ color: '#ef4444', fontWeight: 700 }}>●</span> 80–100% Critical — investigate immediately</span>
        </div>
      )}
    </div>
  );
};

export default CombinedChartPanel;
