import React, { useMemo } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Brush,
} from 'recharts';
import {
  SENSOR_CONFIG, type KnownSensorType, type SensorChartPoint,
  type SensorThresholds, thinData,
} from './chartConfig';

interface SensorChartProps {
  type: KnownSensorType;
  data: SensorChartPoint[];
  mode: 'live' | 'history';
  thresholds?: SensorThresholds;
  height?: number;
  showBrush?: boolean;
}

const AnomalyDot = (props: Record<string, unknown>) => {
  const { cx, cy, payload } = props as { cx: number; cy: number; payload: SensorChartPoint };
  if (!payload?.isAnomaly) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill="#ef4444" fillOpacity={0.12} />
      <circle cx={cx} cy={cy} r={7} fill="#ef4444" stroke="#fff" strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={3} fill="#fff" />
    </g>
  );
};

const SensorTooltip = ({
  active, payload, label, unit, thresholds,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: SensorChartPoint }>;
  label?: string;
  unit: string;
  thresholds?: SensorThresholds;
}) => {
  if (!active || !payload?.length) return null;
  const pt = payload[0];
  const val = pt.value;
  const isWarn = thresholds && (val > thresholds.warningMax || val < thresholds.warningMin);
  const isCrit = thresholds && (val > thresholds.criticalMax || val < thresholds.criticalMin);
  const statusColor = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981';
  const statusLabel = isCrit ? '🔴 CRITICAL SPIKE' : isWarn ? '🟡 WARNING' : '🟢 Normal';
  return (
    <div style={{
      background: 'var(--color-surface, #fff)',
      border: `1.5px solid ${statusColor}`,
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
      minWidth: 160,
    }}>
      <div style={{ color: '#888', marginBottom: 6, fontSize: 11 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: statusColor, lineHeight: 1 }}>
        {Number(val).toFixed(2)} {unit}
      </div>
      <div style={{ marginTop: 5, fontSize: 11, color: statusColor, fontWeight: 600 }}>
        {statusLabel}
      </div>
      {thresholds && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #f0f0f0', fontSize: 10, color: '#aaa' }}>
          Baseline: {thresholds.mean.toFixed(2)} {unit}
          {' · '}
          {val > thresholds.mean ? '+' : ''}{((val - thresholds.mean) / thresholds.mean * 100).toFixed(1)}% dev
        </div>
      )}
      {pt.payload?.isAnomaly && (
        <div style={{ marginTop: 4, color: '#ef4444', fontWeight: 700, fontSize: 11 }}>
          ⚡ AI-detected anomaly
        </div>
      )}
    </div>
  );
};

const StatsBar = ({ data, unit, color, thresholds }: {
  data: SensorChartPoint[]; unit: string; color: string; thresholds?: SensorThresholds;
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
  const deviation = thresholds
    ? (((stats.latest - thresholds.mean) / thresholds.mean) * 100).toFixed(1)
    : null;
  const devNum = deviation ? parseFloat(deviation) : 0;
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, alignItems: 'center' }}>
      <span>
        <span style={{ color: '#999', fontSize: 11 }}>Now </span>
        <strong style={{ color, fontSize: 17 }}>{stats.latest.toFixed(2)}</strong>
        <span style={{ color: '#aaa', fontSize: 11 }}> {unit}</span>
      </span>
      {deviation !== null && (
        <span style={{
          color: devNum > 10 ? '#ef4444' : devNum > 5 ? '#f59e0b' : '#10b981',
          fontWeight: 700, fontSize: 12,
          background: devNum > 10 ? '#fee2e2' : devNum > 5 ? '#fef9c3' : '#f0fdf4',
          borderRadius: 8, padding: '2px 8px',
        }}>
          {devNum >= 0 ? '+' : ''}{deviation}% vs μ
        </span>
      )}
      <span style={{ color: '#94a3b8' }}>↓ {stats.min.toFixed(1)}</span>
      <span style={{ color: '#94a3b8' }}>↑ {stats.max.toFixed(1)}</span>
      <span style={{ color: '#94a3b8' }}>avg {stats.avg.toFixed(1)}</span>
      {stats.anomalies > 0 && (
        <span style={{
          background: '#fee2e2', color: '#ef4444', borderRadius: 12,
          padding: '2px 10px', fontWeight: 700, fontSize: 11,
          animation: 'pulse 2s infinite',
        }}>
          ⚡ {stats.anomalies} spike{stats.anomalies > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};

const GradientDef = ({ id, color }: { id: string; color: string }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.35} />
      <stop offset="60%" stopColor={color} stopOpacity={0.08} />
      <stop offset="100%" stopColor={color} stopOpacity={0.01} />
    </linearGradient>
    <linearGradient id={`${id}-spike`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
    </linearGradient>
  </defs>
);

const SensorChart: React.FC<SensorChartProps> = ({
  type, data, mode, thresholds, height = 280, showBrush = false,
}) => {
  const { color, gradientId, unit, label, domain } = SENSOR_CONFIG[type];
  const displayData = useMemo(() => thinData(data, 300), [data]);

  // Dynamic Y domain: fit to actual data range so spikes are visually prominent
  const dynamicDomain = useMemo((): [number, number] => {
    if (!displayData.length) return domain;
    const vals = displayData.map((d) => d.value);
    const dMin = Math.min(...vals);
    const dMax = Math.max(...vals);
    const range = dMax - dMin || 1;
    const pad = range * 0.2;
    // Allow 10% above config max so critical spikes aren't clipped
    return [
      Math.max(domain[0] * 0.9, dMin - pad),
      Math.min(domain[1] * 1.1, dMax + pad),
    ];
  }, [displayData, domain]);

  // Anomaly windows — merge adjacent anomaly points into bands
  const anomalyBands = useMemo(() => {
    const bands: Array<{ x1: string; x2: string }> = [];
    let start: string | null = null;
    for (let i = 0; i < displayData.length; i++) {
      const pt = displayData[i];
      const next = displayData[i + 1];
      if (pt.isAnomaly && !start) start = displayData[Math.max(0, i - 1)].timestamp;
      if (start && (!pt.isAnomaly || !next)) {
        bands.push({ x1: start, x2: next?.timestamp ?? pt.timestamp });
        start = null;
      }
    }
    return bands;
  }, [displayData]);

  const tickFmt = (ts: string) => {
    try {
      const d = new Date(ts);
      return mode === 'live'
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
          d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ts.slice(11, 19); }
  };

  if (!displayData.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#94a3b8', fontSize: 13 }}>
        Waiting for data…
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={displayData} margin={{ top: 12, right: 20, left: 0, bottom: showBrush ? 28 : 6 }}>
        <GradientDef id={gradientId} color={color} />

        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" opacity={0.5} vertical={false} />

        <XAxis
          dataKey="timestamp" tickFormatter={tickFmt}
          tick={{ fontSize: 10, fill: 'var(--color-subtle, #94a3b8)' }}
          tickLine={false} axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={dynamicDomain} width={52}
          tick={{ fontSize: 10, fill: 'var(--color-subtle, #94a3b8)' }}
          tickLine={false} axisLine={false}
          tickFormatter={(v: number) => `${v.toFixed(1)}${unit.length <= 3 ? unit : ''}`}
        />

        <Tooltip content={<SensorTooltip unit={unit} thresholds={thresholds} />} />

        {/* Threshold reference lines */}
        {thresholds && (
          <>
            <ReferenceLine y={thresholds.mean} stroke={color} strokeDasharray="6 3"
              strokeWidth={1.5} strokeOpacity={0.6}
              label={{ value: `μ ${thresholds.mean.toFixed(1)}`, position: 'insideTopRight', fontSize: 10, fill: color }} />
            <ReferenceLine y={thresholds.warningMax} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: '⚠ Warn', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />
            <ReferenceLine y={thresholds.criticalMax} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={2}
              label={{ value: '🔴 Critical', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
            {thresholds.warningMin > dynamicDomain[0] && (
              <ReferenceLine y={thresholds.warningMin} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5} />
            )}
            {thresholds.criticalMin > dynamicDomain[0] && (
              <ReferenceLine y={thresholds.criticalMin} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={2} />
            )}
          </>
        )}

        {/* Red bands behind anomaly spikes */}
        {anomalyBands.map((band, i) => (
          <ReferenceArea
            key={i} x1={band.x1} x2={band.x2}
            fill="#ef4444" fillOpacity={0.12}
            stroke="#ef4444" strokeOpacity={0.3} strokeWidth={1}
          />
        ))}

        {/* Main area */}
        <Area
          type="monotone" dataKey="value"
          stroke={color} strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={<AnomalyDot />}
          activeDot={{ r: 6, stroke: color, strokeWidth: 2.5, fill: '#fff' }}
          isAnimationActive={mode !== 'live'}
          name={label}
        />

        {showBrush && (
          <Brush dataKey="timestamp" height={22} travellerWidth={6}
            tickFormatter={tickFmt} stroke={color}
            fill="var(--color-surface-alt, #f8fafc)" />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
};

const TrendBadge = ({ trend, trendPct, type }: {
  trend: 'stable' | 'increasing' | 'decreasing';
  trendPct: number;
  type: KnownSensorType;
}) => {
  const isBad = type === 'rpm' ? trend === 'decreasing' : trend === 'increasing';
  const label = trend === 'stable' ? '● Stable'
    : trend === 'increasing' ? `↑ +${trendPct.toFixed(1)}%`
    : `↓ ${Math.abs(trendPct).toFixed(1)}%`;
  const bg  = trend === 'stable' ? '#f0fdf4' : isBad ? '#fee2e2' : '#eff6ff';
  const fg  = trend === 'stable' ? '#16a34a' : isBad ? '#ef4444' : '#2563eb';
  return (
    <span style={{ background: bg, color: fg, borderRadius: 12, padding: '2px 9px',
                   fontSize: 11, fontWeight: 700 }}>
      {label}
    </span>
  );
};

export interface SensorChartPanelProps extends SensorChartProps {
  isLoading?: boolean;
}

export const SensorChartPanel: React.FC<SensorChartPanelProps> = ({ isLoading, ...props }) => {
  const { type, data, mode, thresholds } = props;
  const { color, icon, label, unit } = SENSOR_CONFIG[type];
  const anomalyCount = data.filter((d) => d.isAnomaly).length;
  const hasAnomaly = anomalyCount > 0;

  return (
    <div style={{
      background: 'var(--color-surface, #fff)',
      borderRadius: 14,
      padding: '18px 22px 14px',
      border: `1.5px solid ${hasAnomaly ? '#fca5a5' : 'var(--color-border, #e2e8f0)'}`,
      boxShadow: hasAnomaly
        ? '0 0 0 3px rgba(239,68,68,0.08), 0 4px 16px rgba(0,0,0,0.06)'
        : '0 2px 8px var(--color-card-shadow, rgba(0,0,0,0.05))',
      display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17,
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{label}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>in {unit}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {thresholds && (
            <TrendBadge trend={thresholds.trend} trendPct={thresholds.trendPct} type={type} />
          )}
          {hasAnomaly && (
            <span style={{
              background: '#fee2e2', color: '#ef4444', borderRadius: 12,
              padding: '3px 10px', fontSize: 11, fontWeight: 700,
              animation: 'pulse-critical 2s infinite',
            }}>
              ⚡ {anomalyCount} spike{anomalyCount > 1 ? 's' : ''}
            </span>
          )}
          {mode === 'live' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: color,
                boxShadow: `0 0 8px ${color}`, display: 'inline-block',
                animation: 'pulse 2s infinite',
              }} />
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>LIVE</span>
            </span>
          )}
        </div>
      </div>

      {/* Baseline note */}
      {thresholds && !isLoading && (
        <div style={{
          fontSize: 10, color: '#94a3b8',
          background: 'var(--color-surface-alt, #f8fafc)',
          padding: '4px 10px', borderRadius: 6, display: 'inline-flex', gap: 12, flexWrap: 'wrap',
        }}>
          <span>Baseline μ = <strong>{thresholds.mean.toFixed(2)} {unit}</strong></span>
          <span>Warn &gt; <strong style={{ color: '#f59e0b' }}>{thresholds.warningMax.toFixed(1)}</strong></span>
          <span>Critical &gt; <strong style={{ color: '#ef4444' }}>{thresholds.criticalMax.toFixed(1)}</strong></span>
        </div>
      )}

      {/* Stats bar */}
      {!isLoading && <StatsBar data={data} unit={unit} color={color} thresholds={thresholds} />}

      {/* Chart */}
      {isLoading ? (
        <div style={{ height: props.height ?? 280, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
          <span style={{ animation: 'spin 1s linear infinite', marginRight: 8, display: 'inline-block' }}>⟳</span>
          Computing baseline…
        </div>
      ) : (
        <SensorChart {...props} height={props.height ?? 280} />
      )}
    </div>
  );
};

export default SensorChart;
