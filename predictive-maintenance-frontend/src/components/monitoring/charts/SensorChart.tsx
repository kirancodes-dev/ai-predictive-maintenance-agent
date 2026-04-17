import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';
import {
  SENSOR_CONFIG,
  type KnownSensorType,
  type SensorChartPoint,
  type SensorThresholds,
  thinData,
} from './chartConfig';

interface SensorChartProps {
  type: KnownSensorType;
  data: SensorChartPoint[];
  mode: 'live' | 'history';
  /** Auto-computed thresholds from useBaseline — no manual config needed */
  thresholds?: SensorThresholds;
  height?: number;
  showBrush?: boolean;
}

/* ── Anomaly dot ───────────────────────────────────────── */
const AnomalyDot = (props: Record<string, unknown>) => {
  const { cx, cy, payload } = props as { cx: number; cy: number; payload: SensorChartPoint };
  if (!payload?.isAnomaly) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={11} fill="#ef4444" fillOpacity={0.15} />
    </g>
  );
};

/* ── Tooltip ───────────────────────────────────────────── */
const SensorTooltip = ({
  active, payload, label, unit,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: SensorChartPoint }>;
  label?: string;
  unit: string;
}) => {
  if (!active || !payload?.length) return null;
  const pt = payload[0];
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      <div style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>
        {Number(pt.value).toFixed(3)} {unit}
      </div>
      {pt.payload?.isAnomaly && (
        <div style={{ color: '#ef4444', fontWeight: 600, marginTop: 3 }}>⚠ Anomaly</div>
      )}
    </div>
  );
};

/* ── Stats bar ─────────────────────────────────────────── */
const StatsBar = ({ data, unit, color, thresholds }: {
  data: SensorChartPoint[];
  unit: string;
  color: string;
  thresholds?: SensorThresholds;
}) => {
  const stats = useMemo(() => {
    if (!data.length) return null;
    const vals = data.map((d) => d.value);
    return {
      latest:    vals[vals.length - 1],
      min:       Math.min(...vals),
      max:       Math.max(...vals),
      avg:       vals.reduce((a, b) => a + b, 0) / vals.length,
      anomalies: data.filter((d) => d.isAnomaly).length,
    };
  }, [data]);

  if (!stats) return null;
  const deviation = thresholds
    ? (((stats.latest - thresholds.mean) / thresholds.mean) * 100).toFixed(1)
    : null;

  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12,
                  color: 'var(--color-text-secondary)' }}>
      <span>
        <span style={{ color: 'var(--color-text-muted)' }}>Now </span>
        <strong style={{ color, fontSize: 15 }}>
          {stats.latest.toFixed(2)} {unit}
        </strong>
      </span>
      {deviation !== null && (
        <span style={{ color: parseFloat(deviation) > 0 ? '#f59e0b' : '#10b981' }}>
          {parseFloat(deviation) >= 0 ? '+' : ''}{deviation}% vs baseline
        </span>
      )}
      <span>Min {stats.min.toFixed(1)}</span>
      <span>Max {stats.max.toFixed(1)}</span>
      <span>Avg {stats.avg.toFixed(1)}</span>
      {stats.anomalies > 0 && (
        <span style={{ background: '#fee2e2', color: '#ef4444', borderRadius: 12,
                       padding: '1px 8px', fontWeight: 600 }}>
          {stats.anomalies} anomaly{stats.anomalies > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};

/* ── Gradient def ──────────────────────────────────────── */
const GradientDef = ({ id, color }: { id: string; color: string }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor={color} stopOpacity={0.22} />
      <stop offset="95%" stopColor={color} stopOpacity={0.02} />
    </linearGradient>
  </defs>
);

/* ── Main chart ─────────────────────────────────────────── */
const SensorChart: React.FC<SensorChartProps> = ({
  type, data, mode, thresholds, height = 220, showBrush = false,
}) => {
  const { color, gradientId, unit, label, domain } = SENSOR_CONFIG[type];
  const displayData = useMemo(() => thinData(data, 300), [data]);

  const tickFmt = (ts: string) => {
    try {
      const d = new Date(ts);
      return mode === 'live'
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
            + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ts.slice(11, 19); }
  };

  const sharedInner = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
      <XAxis dataKey="timestamp" tickFormatter={tickFmt}
        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
        tickLine={false} axisLine={false} interval="preserveStartEnd" />
      <YAxis domain={domain} width={46}
        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
        tickLine={false} axisLine={false}
        tickFormatter={(v: number) => `${v}${unit.length <= 3 ? unit : ''}`} />
      <Tooltip content={<SensorTooltip unit={unit} />} />

      {/* Auto-computed threshold reference lines */}
      {thresholds && (
        <>
          <ReferenceLine y={thresholds.mean} stroke={color} strokeDasharray="6 3"
            strokeWidth={1} strokeOpacity={0.5}
            label={{ value: 'μ', position: 'insideTopRight', fontSize: 9, fill: color }} />
          <ReferenceLine y={thresholds.warningMax} stroke="#f59e0b" strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: 'Warn', position: 'insideTopRight', fontSize: 9, fill: '#f59e0b' }} />
          <ReferenceLine y={thresholds.criticalMax} stroke="#ef4444" strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: 'Crit', position: 'insideTopRight', fontSize: 9, fill: '#ef4444' }} />
          <ReferenceLine y={thresholds.warningMin} stroke="#f59e0b" strokeDasharray="4 3"
            strokeWidth={1.5} />
          <ReferenceLine y={thresholds.criticalMin} stroke="#ef4444" strokeDasharray="4 3"
            strokeWidth={1.5} />
        </>
      )}
    </>
  );

  if (!displayData.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-text-muted)', fontSize: 13 }}>
        Waiting for data…
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {mode === 'live' ? (
        <LineChart data={displayData}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <GradientDef id={gradientId} color={color} />
          {sharedInner}
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2}
            dot={<AnomalyDot />}
            activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: '#fff' }}
            isAnimationActive={false} name={label} />
        </LineChart>
      ) : (
        <AreaChart data={displayData}
          margin={{ top: 8, right: 16, left: 0, bottom: showBrush ? 24 : 4 }}>
          <GradientDef id={gradientId} color={color} />
          {sharedInner}
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2}
            fill={`url(#${gradientId})`} dot={false}
            activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: '#fff' }}
            name={label} />
          {showBrush && (
            <Brush dataKey="timestamp" height={20} travellerWidth={6}
              tickFormatter={tickFmt} stroke={color} fill="var(--color-surface)" />
          )}
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
};

/* ── Trend badge ────────────────────────────────────────── */
const TrendBadge = ({ trend, trendPct, type }: {
  trend: 'stable' | 'increasing' | 'decreasing';
  trendPct: number;
  type: KnownSensorType;
}) => {
  // For rpm, decreasing is bad; for everything else, increasing is bad
  const isBad = (type === 'rpm') ? trend === 'decreasing' : trend === 'increasing';
  const label = trend === 'stable' ? '● Stable'
    : trend === 'increasing' ? `↑ +${trendPct}%`
    : `↓ ${trendPct}%`;
  const bg    = trend === 'stable' ? '#f0fdf4' : isBad ? '#fee2e2' : '#eff6ff';
  const fg    = trend === 'stable' ? '#16a34a' : isBad ? '#ef4444' : '#2563eb';

  return (
    <span style={{ background: bg, color: fg, borderRadius: 12, padding: '2px 9px',
                   fontSize: 11, fontWeight: 700 }}>
      {label}
    </span>
  );
};

/* ── Panel (card + header + stats) ─────────────────────── */
export interface SensorChartPanelProps extends SensorChartProps {
  isLoading?: boolean;
}

export const SensorChartPanel: React.FC<SensorChartPanelProps> = ({ isLoading, ...props }) => {
  const { type, data, mode, thresholds } = props;
  const { color, icon, label, unit } = SENSOR_CONFIG[type];
  const anomalyCount = data.filter((d) => d.isAnomaly).length;
  const hasAnomaly   = anomalyCount > 0;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${hasAnomaly ? '#fca5a5' : 'var(--color-border)'}`,
        borderRadius: 12, padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
        boxShadow: hasAnomaly ? '0 0 0 2px #fee2e233' : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>({unit})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {thresholds && (
            <TrendBadge trend={thresholds.trend} trendPct={thresholds.trendPct} type={type} />
          )}
          {hasAnomaly && (
            <span style={{ background: '#fee2e2', color: '#ef4444', borderRadius: 12,
                           padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              ⚠ {anomalyCount} anomal{anomalyCount > 1 ? 'ies' : 'y'}
            </span>
          )}
          {mode === 'live' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color,
                             boxShadow: `0 0 6px ${color}`, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Live</span>
            </span>
          )}
        </div>
      </div>

      {/* Baseline source tag */}
      {thresholds && !isLoading && (
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
          Baseline μ = {thresholds.mean.toFixed(2)} {unit} · auto-computed from 7-day history
        </div>
      )}

      {!isLoading && <StatsBar data={data} unit={unit} color={color} thresholds={thresholds} />}

      {isLoading ? (
        <div style={{ height: props.height ?? 220, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
          Computing baseline…
        </div>
      ) : (
        <SensorChart {...props} />
      )}
    </div>
  );
};

export default SensorChart;
