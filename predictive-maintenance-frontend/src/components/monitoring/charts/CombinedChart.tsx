import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';
import {
  SENSOR_CONFIG,
  KNOWN_SENSOR_TYPES,
  type KnownSensorType,
  type CombinedDataPoint,
  thinData,
} from './chartConfig';

interface CombinedChartProps {
  data: CombinedDataPoint[];
  mode: 'live' | 'history';
  height?: number;
  showBrush?: boolean;
}

/* ── Custom tooltip ─────────────────────────────────────── */
const CombinedTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  const tsLabel = (() => {
    try {
      const d = new Date(label ?? '');
      return d.toLocaleString([], {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch {
      return label ?? '';
    }
  })();

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        minWidth: 180,
      }}
    >
      <div style={{ color: 'var(--color-text-muted)', marginBottom: 6, fontSize: 11 }}>
        {tsLabel}
      </div>
      {payload.map((p) => {
        const type = (p.name.replace('_pct', '') as KnownSensorType);
        const cfg = SENSOR_CONFIG[type];
        return (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between',
                                     gap: 16, marginBottom: 3 }}>
            <span style={{ color: p.color, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{cfg?.icon ?? ''}</span>
              <span>{cfg?.label ?? p.name}</span>
            </span>
            <strong style={{ color: p.color }}>{Number(p.value).toFixed(1)}%</strong>
          </div>
        );
      })}
      <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 6, paddingTop: 5,
                    fontSize: 10, color: 'var(--color-text-muted)' }}>
        % of operational range
      </div>
    </div>
  );
};

/* ── Legend renderer ────────────────────────────────────── */
const renderLegend = (
  props: { payload?: Array<{ value: string; color: string }> },
  hidden: Set<string>,
  toggle: (key: string) => void,
) => {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
                  padding: '4px 0', marginTop: 4 }}>
      {(props.payload ?? []).map((entry) => {
        const type = entry.value.replace('_pct', '') as KnownSensorType;
        const cfg = SENSOR_CONFIG[type];
        const isHidden = hidden.has(entry.value);
        return (
          <button
            key={entry.value}
            onClick={() => toggle(entry.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              background: 'none', border: '1px solid var(--color-border)', borderRadius: 20,
              padding: '3px 10px', fontSize: 12, fontWeight: 500,
              opacity: isHidden ? 0.35 : 1,
              color: isHidden ? 'var(--color-text-muted)' : entry.color,
              transition: 'opacity 0.2s',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%',
                           background: isHidden ? 'var(--color-border)' : entry.color,
                           display: 'inline-block', flexShrink: 0 }} />
            {cfg?.icon} {cfg?.label ?? type}
          </button>
        );
      })}
    </div>
  );
};

/* ── Main component ─────────────────────────────────────── */
const CombinedChart: React.FC<CombinedChartProps> = ({
  data,
  mode,
  height = 280,
  showBrush = false,
}) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const displayData = useMemo(() => thinData(data, 300), [data]);

  const tickFormatter = (ts: string) => {
    try {
      const d = new Date(ts);
      return mode === 'live'
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return ts.slice(11, 16);
    }
  };

  if (!displayData.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-text-muted)', fontSize: 13 }}>
        Waiting for combined data…
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={displayData}
          margin={{ top: 8, right: 16, left: 0, bottom: showBrush ? 24 : 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 110]}
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            tickLine={false}
            axisLine={false}
            width={38}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<CombinedTooltip />} />
          <Legend
            content={(props) =>
              renderLegend(
                props as Parameters<typeof renderLegend>[0],
                hidden,
                toggle,
              )
            }
          />

          {/* Warning (75%) and critical (100%) bands */}
          <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1}
            label={{ value: 'Warn 75%', position: 'insideTopRight', fontSize: 9, fill: '#f59e0b' }} />
          <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1}
            label={{ value: 'Crit 100%', position: 'insideTopRight', fontSize: 9, fill: '#ef4444' }} />

          {KNOWN_SENSOR_TYPES.map((type) => {
            const key = `${type}_pct`;
            const cfg = SENSOR_CONFIG[type];
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={cfg.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: cfg.color, strokeWidth: 2, fill: '#fff' }}
                name={key}
                hide={hidden.has(key)}
                isAnimationActive={false}
                connectNulls
              />
            );
          })}

          {showBrush && (
            <Brush dataKey="timestamp" height={20} travellerWidth={6}
              tickFormatter={tickFormatter} stroke="#6366f1" fill="var(--color-surface)" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ── Panel wrapper ──────────────────────────────────────── */
interface CombinedChartPanelProps extends CombinedChartProps {
  isLoading?: boolean;
}

export const CombinedChartPanel: React.FC<CombinedChartPanelProps> = ({
  isLoading,
  ...props
}) => (
  <div
    style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 12 }}>
      <div>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
          Combined Sensor Overview
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>
          All sensors · % of operational range
        </span>
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)',
                     background: 'var(--color-bg-secondary)', borderRadius: 8, padding: '2px 8px' }}>
        Click legend to toggle
      </span>
    </div>
    {isLoading ? (
      <div style={{ height: props.height ?? 280, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
        Loading…
      </div>
    ) : (
      <CombinedChart {...props} />
    )}
  </div>
);

export default CombinedChart;
