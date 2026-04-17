import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import {
  SENSOR_CONFIG, KNOWN_SENSOR_TYPES,
  type CombinedDataPoint, type SensorThresholds, type KnownSensorType,
  normalizeThreshold, thinData,
} from './chartConfig';

type ViewMode = 'normalized' | 'raw';

interface CombinedChartProps {
  data: CombinedDataPoint[];
  mode: 'live' | 'history';
  height?: number;
  isLoading?: boolean;
  thresholdsByType?: Partial<Record<KnownSensorType, SensorThresholds>>;
}

/* ── helpers ── */
function fmtTime(ts: string, mode: 'live' | 'history') {
  try {
    const d = new Date(ts);
    return mode === 'live'
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ts.slice(11, 19); }
}

/* ── Tooltip ── */
const CombinedTooltip = ({
  active, payload, label, viewMode, thresholdsByType,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  viewMode: ViewMode;
  thresholdsByType?: Partial<Record<KnownSensorType, SensorThresholds>>;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface,#fff)',
      border: '1.5px solid var(--color-border,#e2e8f0)',
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
      minWidth: 190, fontSize: 12,
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 8, fontSize: 10, fontWeight: 600 }}>{label}</div>
      {KNOWN_SENSOR_TYPES.map((t) => {
        const entry = payload.find((p) => p.dataKey === `${t}_pct` || p.dataKey === t);
        if (!entry) return null;
        const cfg = SENSOR_CONFIG[t];
        const raw = entry.value;
        const thresh = thresholdsByType?.[t];
        const rawVal = viewMode === 'normalized'
          ? undefined
          : raw;
        const pctVal = viewMode === 'normalized' ? raw : undefined;
        const isCrit = thresh && pctVal !== undefined &&
          pctVal >= normalizeThreshold(t, thresh.criticalMax);
        const isWarn = !isCrit && thresh && pctVal !== undefined &&
          pctVal >= normalizeThreshold(t, thresh.warningMax);
        const icon = isCrit ? '🔴' : isWarn ? '🟡' : '🟢';
        return (
          <div key={t} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 12, marginBottom: 5, paddingBottom: 4,
            borderBottom: '1px solid var(--color-border-light,#f0f0f0)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
              <span style={{ color: cfg.color, fontWeight: 700, fontSize: 11 }}>{cfg.label}</span>
            </span>
            <span style={{ fontWeight: 800, fontSize: 13 }}>
              {icon} {viewMode === 'normalized'
                ? `${raw.toFixed(1)}%`
                : `${raw.toFixed(2)} ${cfg.unit}`}
            </span>
          </div>
        );
      })}
      {viewMode === 'normalized' && (
        <div style={{ marginTop: 4, fontSize: 10, color: '#94a3b8' }}>
          Higher % = closer to failure limit
        </div>
      )}
    </div>
  );
};

/* ── Spike event log entry ── */
interface SpikeEvent {
  timestamp: string;
  sensors: Array<{ type: KnownSensorType; pct: number; rawVal?: number }>;
}

/* ── Main panel ── */
export const CombinedChartPanel: React.FC<CombinedChartProps> = ({
  data, mode, height = 420, isLoading = false, thresholdsByType = {},
}) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('normalized');
  const displayData = useMemo(() => thinData(data, 350), [data]);

  const toggle = (key: string) =>
    setHidden((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  /* latest values */
  const latest = useMemo(() => displayData[displayData.length - 1], [displayData]);

  /* Anomaly bands from real AI-detected flags */
  const anomalyBands = useMemo(() => {
    const bands: Array<{ x1: string; x2: string; sensors: KnownSensorType[] }> = [];
    let start: string | null = null;
    let active: KnownSensorType[] = [];
    for (let i = 0; i < displayData.length; i++) {
      const pt = displayData[i];
      const spiking = KNOWN_SENSOR_TYPES.filter(
        (t) => !hidden.has(t) && pt[`${t}_anomaly`] === true,
      );
      const isAnomalous = spiking.length > 0;
      const next = displayData[i + 1];
      if (isAnomalous && !start) { start = displayData[Math.max(0, i - 1)].timestamp; active = spiking; }
      if (start && (!isAnomalous || !next)) {
        bands.push({ x1: start, x2: next?.timestamp ?? pt.timestamp, sensors: active });
        start = null; active = [];
      }
    }
    return bands;
  }, [displayData, hidden]);

  /* Per-sensor threshold lines in normalized % space */
  const threshLines = useMemo(() => {
    if (viewMode !== 'normalized') return [];
    const lines: Array<{ pct: number; color: string; label: string; dash: string }> = [];
    for (const t of KNOWN_SENSOR_TYPES) {
      if (hidden.has(t)) continue;
      const th = thresholdsByType[t];
      if (!th) continue;
      const cfg = SENSOR_CONFIG[t];
      lines.push({
        pct: normalizeThreshold(t, th.warningMax),
        color: '#f59e0b', dash: '5 3',
        label: `${cfg.label} warn`,
      });
      lines.push({
        pct: normalizeThreshold(t, th.criticalMax),
        color: cfg.color, dash: '4 2',
        label: `${cfg.label} crit`,
      });
    }
    // deduplicate near-identical lines (within 1%)
    return lines.filter((l, i, arr) =>
      arr.findIndex((x) => x.color === l.color && Math.abs(x.pct - l.pct) < 1) === i,
    );
  }, [thresholdsByType, hidden, viewMode]);

  /* Spike event log — last 6 anomaly events */
  const spikeLog = useMemo((): SpikeEvent[] => {
    const events: SpikeEvent[] = [];
    let prev = false;
    for (const pt of displayData) {
      const spiking = KNOWN_SENSOR_TYPES.filter((t) => pt[`${t}_anomaly`] === true);
      if (spiking.length > 0 && !prev) {
        events.push({
          timestamp: pt.timestamp,
          sensors: spiking.map((t) => ({
            type: t,
            pct: (pt[`${t}_pct`] as number) ?? 0,
            rawVal: pt[t] as number | undefined,
          })),
        });
      }
      prev = spiking.length > 0;
    }
    return events.slice(-6).reverse();
  }, [displayData]);

  const tickFmt = (ts: string) => fmtTime(ts, mode);

  /* ── empty states ── */
  if (isLoading) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
      <span style={{ animation: 'spin 1s linear infinite', marginRight: 8, display: 'inline-block' }}>⟳</span>
      Loading sensor data…
    </div>
  );
  if (!displayData.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
      Waiting for data…
    </div>
  );

  const hasSpikeNow = anomalyBands.length > 0;

  return (
    <div style={{
      background: 'var(--color-surface,#fff)', borderRadius: 16,
      padding: '20px 24px 18px',
      border: `1.5px solid ${hasSpikeNow ? '#fca5a5' : 'var(--color-border,#e2e8f0)'}`,
      boxShadow: hasSpikeNow
        ? '0 0 0 3px rgba(239,68,68,0.07), 0 6px 20px rgba(0,0,0,0.07)'
        : '0 2px 10px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 16,
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>

      {/* ── Title row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Combined Sensor Overview</span>
            {mode === 'live' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
                               boxShadow: '0 0 8px #22c55e80', display: 'inline-block',
                               animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>LIVE</span>
              </span>
            )}
            {hasSpikeNow && (
              <span style={{ fontSize: 11, background: '#fee2e2', color: '#ef4444',
                             borderRadius: 20, padding: '2px 10px', fontWeight: 700,
                             animation: 'pulse-critical 2s infinite' }}>
                ⚡ {anomalyBands.length} active spike{anomalyBands.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
            {viewMode === 'normalized'
              ? 'All sensors shown as % of operating range — threshold lines mark warning & critical limits'
              : 'Raw sensor values — each sensor uses its own scale'}
          </div>
        </div>

        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1.5px solid var(--color-border,#e2e8f0)' }}>
          {(['normalized', 'raw'] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setViewMode(m)} style={{
              padding: '5px 14px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: viewMode === m ? 'var(--color-primary,#3b82f6)' : 'transparent',
              color: viewMode === m ? '#fff' : 'var(--color-muted,#94a3b8)',
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
          {KNOWN_SENSOR_TYPES.map((t) => {
            const cfg = SENSOR_CONFIG[t];
            const rawVal = latest[t] as number | undefined;
            const pct = (latest[`${t}_pct`] as number) ?? 0;
            const isAnomaly = latest[`${t}_anomaly`] === true;
            const thresh = thresholdsByType[t];
            const isCrit = thresh && rawVal !== undefined && rawVal > thresh.criticalMax;
            const isWarn = !isCrit && thresh && rawVal !== undefined && rawVal > thresh.warningMax;
            const statusColor = isAnomaly || isCrit ? '#ef4444' : isWarn ? '#f59e0b' : cfg.color;
            if (rawVal === undefined) return null;
            return (
              <div key={t} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: `${statusColor}12`, border: `1.5px solid ${statusColor}40`,
                borderRadius: 12, padding: '8px 14px', minWidth: 76, position: 'relative',
              }}>
                {(isAnomaly || isCrit) && (
                  <span style={{ position: 'absolute', top: -6, right: -6, fontSize: 12,
                                 animation: 'pulse 1s infinite' }}>⚡</span>
                )}
                <span style={{ fontSize: 15 }}>{cfg.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: statusColor, lineHeight: 1.3 }}>
                  {rawVal.toFixed(1)}
                </span>
                <span style={{ fontSize: 9, color: '#94a3b8' }}>{cfg.unit}</span>
                <span style={{ fontSize: 9, color: statusColor, fontWeight: 600 }}>{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sensor toggles ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {KNOWN_SENSOR_TYPES.map((t) => {
          const cfg = SENSOR_CONFIG[t];
          const isHidden = hidden.has(t);
          const pct = latest ? ((latest[`${t}_pct`] as number) ?? 0) : 0;
          const thresh = thresholdsByType[t];
          const isCrit = thresh ? pct >= normalizeThreshold(t, thresh.criticalMax) : false;
          const isWarn = !isCrit && thresh ? pct >= normalizeThreshold(t, thresh.warningMax) : false;
          const color = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : cfg.color;
          return (
            <button key={t} onClick={() => toggle(t)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px',
              borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 700,
              border: `1.5px solid ${isHidden ? 'var(--color-border,#e2e8f0)' : color}`,
              background: isHidden ? 'transparent' : `${color}15`,
              color: isHidden ? 'var(--color-muted,#94a3b8)' : color,
              opacity: isHidden ? 0.5 : 1, transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 14 }}>{cfg.icon}</span>
              {cfg.label}
              {!isHidden && isCrit && <span>🔴</span>}
              {!isHidden && isWarn && <span>🟡</span>}
            </button>
          );
        })}
      </div>

      {/* ── Chart ── */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={displayData} margin={{ top: 14, right: 22, left: 0, bottom: 8 }}>
          <defs>
            {KNOWN_SENSOR_TYPES.map((t) => {
              const pct = latest ? ((latest[`${t}_pct`] as number) ?? 0) : 0;
              const thresh = thresholdsByType[t];
              const isCrit = thresh ? pct >= normalizeThreshold(t, thresh.criticalMax) : false;
              const isWarn = !isCrit && thresh ? pct >= normalizeThreshold(t, thresh.warningMax) : false;
              const c = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : SENSOR_CONFIG[t].color;
              return (
                <linearGradient key={t} id={`cg-${t}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.4} />
                  <stop offset="65%" stopColor={c} stopOpacity={0.06} />
                  <stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border,#e2e8f0)" opacity={0.5} vertical={false} />
          <XAxis dataKey="timestamp" tickFormatter={tickFmt}
            tick={{ fontSize: 10, fill: 'var(--color-subtle,#94a3b8)' }} tickLine={false} axisLine={false}
            interval="preserveStartEnd" />
          {viewMode === 'normalized' ? (
            <YAxis domain={[0, 100]} width={44}
              tick={{ fontSize: 10, fill: 'var(--color-subtle,#94a3b8)' }} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => `${v}%`} />
          ) : (
            <YAxis width={52}
              tick={{ fontSize: 10, fill: 'var(--color-subtle,#94a3b8)' }} tickLine={false} axisLine={false} />
          )}

          <Tooltip content={<CombinedTooltip viewMode={viewMode} thresholdsByType={thresholdsByType} />} />

          {/* Background zone bands (normalized only) — subtle */}
          {viewMode === 'normalized' && (
            <>
              <ReferenceArea y1={70} y2={85} fill="#f59e0b" fillOpacity={0.05} />
              <ReferenceArea y1={85} y2={100} fill="#ef4444" fillOpacity={0.07} />
            </>
          )}

          {/* Per-sensor threshold lines in normalized % space */}
          {viewMode === 'normalized' && threshLines.map((l, i) => (
            <ReferenceLine key={i} y={l.pct} stroke={l.color} strokeDasharray={l.dash}
              strokeWidth={1.5} strokeOpacity={0.7}
              label={{ value: l.label, position: 'insideTopRight', fontSize: 9, fill: l.color }} />
          ))}

          {/* Spike bands — derived from real AI anomaly flags */}
          {anomalyBands.map((b, i) => (
            <ReferenceArea key={i} x1={b.x1} x2={b.x2}
              fill="#ef4444" fillOpacity={0.13}
              stroke="#ef4444" strokeOpacity={0.35} strokeWidth={1}
              label={{
                value: `⚡ ${b.sensors.map((t) => SENSOR_CONFIG[t].label).join('+')}`,
                position: 'insideTop', fontSize: 9, fill: '#ef4444',
              }}
            />
          ))}

          {/* One area per sensor */}
          {KNOWN_SENSOR_TYPES.map((t) => {
            if (hidden.has(t)) return null;
            const pct = latest ? ((latest[`${t}_pct`] as number) ?? 0) : 0;
            const thresh = thresholdsByType[t];
            const isCrit = thresh ? pct >= normalizeThreshold(t, thresh.criticalMax) : false;
            const isWarn = !isCrit && thresh ? pct >= normalizeThreshold(t, thresh.warningMax) : false;
            const stroke = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : SENSOR_CONFIG[t].color;
            const dataKey = viewMode === 'normalized' ? `${t}_pct` : t;
            return (
              <Area key={t} type="monotone" dataKey={dataKey}
                name={SENSOR_CONFIG[t].label} stroke={stroke} strokeWidth={2.5}
                fill={`url(#cg-${t})`} dot={false}
                activeDot={{ r: 6, stroke, strokeWidth: 2.5, fill: '#fff' }}
                isAnimationActive={mode !== 'live'}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>

      {/* ── Spike event log ── */}
      {spikeLog.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>
            ⚡ Detected Spikes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {spikeLog.map((ev, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                background: '#fff5f5', borderRadius: 8, padding: '6px 12px',
                border: '1px solid #fecaca', fontSize: 11,
                animation: i === 0 ? 'slide-in 0.3s ease' : undefined,
              }}>
                <span style={{ color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>
                  {fmtTime(ev.timestamp, mode)}
                </span>
                {ev.sensors.map((s) => (
                  <span key={s.type} style={{
                    background: `${SENSOR_CONFIG[s.type].color}20`,
                    color: SENSOR_CONFIG[s.type].color,
                    borderRadius: 6, padding: '1px 8px', fontWeight: 700,
                  }}>
                    {SENSOR_CONFIG[s.type].icon} {SENSOR_CONFIG[s.type].label}
                    {s.rawVal !== undefined && ` ${s.rawVal.toFixed(1)} ${SENSOR_CONFIG[s.type].unit}`}
                    {' '}({s.pct.toFixed(0)}%)
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer legend ── */}
      <div style={{ display: 'flex', gap: 20, fontSize: 10, color: '#94a3b8', flexWrap: 'wrap', paddingTop: 2, borderTop: '1px solid var(--color-border-light,#f0f0f0)' }}>
        <span>🟢 Normal — sensor within safe limits</span>
        <span>🟡 Warning — elevated, watch closely</span>
        <span>🔴 Critical — immediate action required</span>
        {viewMode === 'normalized' && <span>· Dashed lines = per-sensor thresholds from 7-day baseline</span>}
      </div>
    </div>
  );
};

export default CombinedChartPanel;
