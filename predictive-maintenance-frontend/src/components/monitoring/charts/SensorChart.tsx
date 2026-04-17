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
  thresholds?: SensorThresholds;
  height?: number;
  showBrush?: boolean;
}

/* ── Custom anomaly dot ─────────────────────────────────── */
const AnomalyDot = (props: Record<string, unknown>) => {
  const { cx, cy, payload } = props as {
    cx: number;
    cy: number;
    payload: SensorChartPoint;
  };
  if (!payload?.isAnomaly) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={10} fill="#ef4444" fillOpacity={0.2} />
    </g>
  );
};

/* ── Custom tooltip ─────────────────────────────────────── */
const SensorTooltip = ({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: SensorChartPoint }>;
  label?: string;
  unit: string;
}) => {
  if (!active || !payload?.length) return null;
  const pt = payload[0];
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>
        {Number(pt.value).toFixed(2)} {unit}
      </div>
      {pt.payload?.isAnomaly && (
        <div style={{ color: '#ef4444', fontWeight: 600, marginTop: 2 }}>⚠ Anomaly</div>
      )}
    </div>
  );
};

/* ── Stats bar ──────────────────────────────────────────── */
const StatsBar = ({
  data,
  unit,
  color,
}: {
  data: SensorChartPoint[];
  unit: string;
  color: string;
}) => {
  const stats = useMemo(() => {
    if (!data.length) return null;
    const vals = data.map((d) => d.value);
    return {
      latest: vals[vals.length - 1],
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      anomalies: data.filter((d) => d.isAnomaly).length,
    };
  }, [data]);

  if (!stats) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        fontSize: 12,
        color: 'var(--color-text-secondary)',
      }}
    >
      <span>
        <span style={{ color: 'var(--color-text-muted)' }}>Now </span>
        <strong style={{ color, fontSize: 15 }}>
          {stats.latest.toFixed(2)} {unit}
        </strong>
      </span>
      <span>Min {stats.min.toFixed(1)}</span>
      <span>Max {stats.max.toFixed(1)}</span>
      <span>Avg {stats.avg.toFixed(1)}</span>
      {stats.anomalies > 0 && (
        <span
          style={{
            background: '#fee2e2',
            color: '#ef4444',
            borderRadius: 12,
            padding: '1px 8px',
            fontWeight: 600,
          }}
        >
          {stats.anomalies} anomaly{stats.anomalies > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};

/* ── Gradient defs shared across charts ─────────────────── */
const GradientDef = ({ id, color }: { id: string; color: string }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor={color} stopOpacity={0.25} />
      <stop offset="95%" stopColor={color} stopOpacity={0.02} />
    </linearGradient>
  </defs>
);

/* ── Main component ─────────────────────────────────────── */
const SensorChart: React.FC<SensorChartProps> = ({
  type,
  data,
  mode,
  thresholds,
  height = 220,
  showBrush = false,
}) => {
  const cfg = SENSOR_CONFIG[type];
  const { color, gradientId, unit, label, domain, defaultWarningMax, defaultWarningMin,
          defaultCriticalMax, defaultCriticalMin } = cfg;

  const warnMax = thresholds?.warningMax ?? defaultWarningMax;
  const warnMin = thresholds?.warningMin ?? defaultWarningMin;
  const critMax = thresholds?.criticalMax ?? defaultCriticalMax;
  const critMin = thresholds?.criticalMin ?? defaultCriticalMin;

  const displayData = useMemo(() => thinData(data, 300), [data]);

  const tickFormatter = (ts: string) => {
    try {
      const d = new Date(ts);
      return mode === 'live'
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
            ' ' +
            d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts.slice(11, 19);
    }
  };

  const commonProps = {
    data: displayData,
    margin: { top: 8, right: 16, left: 0, bottom: showBrush ? 24 : 4 },
  };

  const axisProps = {
    xAxis: (
      <XAxis
        dataKey="timestamp"
        tickFormatter={tickFormatter}
        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
        tickLine={false}
        axisLine={false}
        interval="preserveStartEnd"
      />
    ),
    yAxis: (
      <YAxis
        domain={domain}
        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
        tickLine={false}
        axisLine={false}
        width={45}
        tickFormatter={(v: number) => `${v}${unit.length <= 3 ? unit : ''}`}
      />
    ),
    grid: <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />,
    refLines: (
      <>
        <ReferenceLine y={warnMax} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
          label={{ value: 'Warn', position: 'insideTopRight', fontSize: 9, fill: '#f59e0b' }} />
        <ReferenceLine y={critMax} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
          label={{ value: 'Crit', position: 'insideTopRight', fontSize: 9, fill: '#ef4444' }} />
        <ReferenceLine y={warnMin} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5} />
        <ReferenceLine y={critMin} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5} />
      </>
    ),
    tooltip: (
      <Tooltip content={<SensorTooltip unit={unit} />} />
    ),
  };

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
        <LineChart {...commonProps}>
          <GradientDef id={gradientId} color={color} />
          {axisProps.grid}
          {axisProps.xAxis}
          {axisProps.yAxis}
          {axisProps.refLines}
          {axisProps.tooltip}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={<AnomalyDot />}
            activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: '#fff' }}
            isAnimationActive={false}
            name={label}
          />
        </LineChart>
      ) : (
        <AreaChart {...commonProps}>
          <GradientDef id={gradientId} color={color} />
          {axisProps.grid}
          {axisProps.xAxis}
          {axisProps.yAxis}
          {axisProps.refLines}
          {axisProps.tooltip}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: '#fff' }}
            name={label}
          />
          {showBrush && (
            <Brush dataKey="timestamp" height={20} travellerWidth={6}
              tickFormatter={tickFormatter} stroke={color} fill="var(--color-surface)" />
          )}
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
};

/* ── Panel wrapper (card with header + stats) ───────────── */
export interface SensorChartPanelProps extends SensorChartProps {
  isLoading?: boolean;
}

export const SensorChartPanel: React.FC<SensorChartPanelProps> = ({ isLoading, ...props }) => {
  const { type, data, mode } = props;
  const { color, icon, label, unit } = SENSOR_CONFIG[type];
  const anomalyCount = data.filter((d) => d.isAnomaly).length;
  const hasAnomaly = anomalyCount > 0;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${hasAnomaly ? '#fca5a5' : 'var(--color-border)'}`,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: hasAnomaly ? '0 0 0 2px #fee2e233' : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
            {label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
            ({unit})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

      {/* Stats */}
      {!isLoading && <StatsBar data={data} unit={unit} color={color} />}

      {/* Chart */}
      {isLoading ? (
        <div style={{ height: props.height ?? 220, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
          Loading…
        </div>
      ) : (
        <SensorChart {...props} />
      )}
    </div>
  );
};

export default SensorChart;
