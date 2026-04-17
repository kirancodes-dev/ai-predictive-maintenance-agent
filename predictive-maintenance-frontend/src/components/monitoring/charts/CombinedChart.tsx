import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
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

const CombinedTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-tooltip-bg, #fff)', border: '1px solid var(--color-tooltip-border, #e2e8f0)', borderRadius: 8,
      padding: '8px 12px', fontSize: 11, boxShadow: '0 4px 12px var(--color-card-shadow, rgba(0,0,0,0.1))',
      minWidth: 160, color: 'var(--color-text, #0f172a)',
    }}>
      <div style={{ color: 'var(--color-subtle, #888)', marginBottom: 6, fontSize: 10 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', gap: 12, marginBottom: 2 }}>
          <span style={{ color: p.color, fontWeight: 600 }}>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{p.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

export const CombinedChartPanel: React.FC<CombinedChartProps> = ({
  data, mode, height = 280, isLoading = false,
}) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('normalized');
  const displayData = useMemo(() => thinData(data, 300), [data]);

  const tickFmt = (ts: string) => {
    try {
      const d = new Date(ts);
      return mode === 'live'
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
          d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ts.slice(11, 16); }
  };

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  if (isLoading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#94a3b8', fontSize: 13 }}>
        Loading…
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
      background: 'var(--color-surface, #fff)', borderRadius: 12, padding: '16px 20px',
      border: '1px solid var(--color-border, #e2e8f0)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Combined Sensor View</span>
          <span style={{ fontSize: 11, color: 'var(--color-muted, #94a3b8)', marginLeft: 8 }}>
            {viewMode === 'normalized' ? 'normalized 0–100% of display range' : 'raw sensor values'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Raw / Normalized toggle */}
          <div style={{
            display: 'flex', borderRadius: 8, overflow: 'hidden',
            border: '1px solid var(--color-border, #e2e8f0)',
          }}>
            {(['normalized', 'raw'] as ViewMode[]).map((m) => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                padding: '3px 10px', fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: viewMode === m ? 'var(--color-primary, #3b82f6)' : 'transparent',
                color: viewMode === m ? '#fff' : 'var(--color-muted, #94a3b8)',
                transition: 'all 0.15s',
              }}>
                {m === 'normalized' ? '% Norm' : 'Raw'}
              </button>
            ))}
          </div>
          {KNOWN_SENSOR_TYPES.map((t) => {
            const cfg = SENSOR_CONFIG[t];
            const isHidden = hidden.has(t);
            return (
              <button
                key={t}
                onClick={() => toggle(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                  borderRadius: 20, border: `1.5px solid ${isHidden ? 'var(--color-border, #e2e8f0)' : cfg.color}`,
                  background: isHidden ? 'transparent' : `${cfg.color}18`,
                  color: isHidden ? 'var(--color-muted, #94a3b8)' : cfg.color,
                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%',
                               background: isHidden ? '#cbd5e1' : cfg.color,
                               display: 'inline-block' }} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={displayData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" opacity={0.6} />
          <XAxis dataKey="timestamp" tickFormatter={tickFmt}
            tick={{ fontSize: 10, fill: 'var(--color-muted, #94a3b8)' }} tickLine={false} axisLine={false}
            interval="preserveStartEnd" />
          {viewMode === 'normalized' ? (
            <YAxis domain={[0, 100]} width={40}
              tick={{ fontSize: 10, fill: 'var(--color-muted, #94a3b8)' }} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => `${v}%`} />
          ) : (
            <YAxis width={50}
              tick={{ fontSize: 10, fill: 'var(--color-muted, #94a3b8)' }} tickLine={false} axisLine={false} />
          )}
          <Tooltip content={<CombinedTooltip />} />
          {viewMode === 'normalized' && (
            <>
              <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1}
                label={{ value: 'Warn', position: 'insideTopRight', fontSize: 9, fill: '#f59e0b' }} />
              <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1}
                label={{ value: 'Crit', position: 'insideTopRight', fontSize: 9, fill: '#ef4444' }} />
            </>
          )}
          {KNOWN_SENSOR_TYPES.map((t) => {
            const cfg = SENSOR_CONFIG[t];
            const dataKey = viewMode === 'normalized' ? `${t}_pct` : t;
            return hidden.has(t) ? null : (
              <Line key={t} type="monotone" dataKey={dataKey}
                name={cfg.label} stroke={cfg.color} strokeWidth={2.5}
                dot={false} isAnimationActive={false}
                activeDot={{ r: 4, stroke: cfg.color, strokeWidth: 2, fill: '#fff' }} />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CombinedChartPanel;
