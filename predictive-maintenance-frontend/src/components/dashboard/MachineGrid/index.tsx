import React, { useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Machine } from '../../../types/machine.types';
import { SENSOR_CONFIG, KNOWN_SENSOR_TYPES, type KnownSensorType } from '../../monitoring/charts/chartConfig';
import type { SensorReadingDto } from '../../../services/api/streamApi';

const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e', warning: '#f59e0b', critical: '#ef4444',
  offline: '#94a3b8', maintenance: '#6366f1',
};
const RISK_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
};

/**
 * Alert escalation tiers:
 *   0 = normal
 *   1 = warning (flashing amber border, no sound)
 *   2 = high risk (orange glow + siren button)
 *   3 = critical (red pulsing alarm + siren button)
 */
function getAlertTier(m: Machine, hasAnomaly: boolean): 0 | 1 | 2 | 3 {
  if (m.status === 'critical' || m.riskLevel === 'critical') return 3;
  if (m.riskLevel === 'high' || (m.status === 'warning' && hasAnomaly)) return 2;
  if (m.status === 'warning' || m.riskLevel === 'medium') return 1;
  return 0;
}

const TIER_STYLES: Record<number, React.CSSProperties> = {
  0: {},
  1: {
    animation: 'alert-flash-amber 2s ease-in-out infinite',
    borderColor: '#f59e0b',
  },
  2: {
    animation: 'alert-glow-orange 1.5s ease-in-out infinite',
    borderColor: '#f97316',
    boxShadow: '0 0 12px rgba(249,115,22,0.35)',
  },
  3: {
    animation: 'alert-pulse-red 1s ease-in-out infinite',
    borderColor: '#ef4444',
    boxShadow: '0 0 18px rgba(239,68,68,0.45)',
  },
};

const TIER_LABELS: Record<number, { text: string; color: string; bg: string }> = {
  1: { text: '⚡ Level 1 — Warning', color: '#92400e', bg: '#fef3c7' },
  2: { text: '🔶 Level 2 — High Risk', color: '#9a3412', bg: '#ffedd5' },
  3: { text: '🚨 Level 3 — CRITICAL ALARM', color: '#991b1b', bg: '#fee2e2' },
};

interface Props {
  machines: Machine[];
  isLoading: boolean;
  liveData?: Record<string, SensorReadingDto[]>;
}

/* ── Mini SVG Sparkline ── */
const Sparkline: React.FC<{ values: number[]; color: string; width?: number; height?: number }> = ({
  values, color, width = 60, height = 20,
}) => {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const MachineGrid: React.FC<Props> = ({ machines, isLoading, liveData = {} }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenRef = useRef<OscillatorNode | null>(null);

  // Build per-machine, per-sensor-type history arrays for sparklines
  const sparkData = useMemo(() => {
    const result: Record<string, Record<string, number[]>> = {};
    for (const [machineId, readings] of Object.entries(liveData)) {
      result[machineId] = {};
      for (const r of readings) {
        if (KNOWN_SENSOR_TYPES.includes(r.type as KnownSensorType)) {
          if (!result[machineId][r.type]) result[machineId][r.type] = [];
          result[machineId][r.type].push(r.value);
        }
      }
      // Keep last 20 values per sensor type
      for (const type of Object.keys(result[machineId])) {
        result[machineId][type] = result[machineId][type].slice(-20);
      }
    }
    return result;
  }, [liveData]);

  // Siren toggle — plays a pulsing tone via Web Audio API
  const toggleSiren = useCallback(() => {
    if (sirenRef.current) {
      sirenRef.current.stop();
      sirenRef.current = null;
      return;
    }
    const ctx = audioCtxRef.current ?? new AudioContext();
    audioCtxRef.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    // Sweep 440→880→440 every 0.8s
    const now = ctx.currentTime;
    for (let i = 0; i < 20; i++) {
      osc.frequency.linearRampToValueAtTime(880, now + i * 0.8 + 0.4);
      osc.frequency.linearRampToValueAtTime(440, now + i * 0.8 + 0.8);
    }
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(now + 16);
    sirenRef.current = osc;
    osc.onended = () => { sirenRef.current = null; };
  }, []);

  if (isLoading) return <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>Loading machines…</p>;
  if (!machines.length) return <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>No machines found.</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
      {machines.map((m) => {
        const live = liveData[m.id] ?? [];
        const latestByType: Partial<Record<KnownSensorType, SensorReadingDto>> = {};
        for (const r of live) {
          if (KNOWN_SENSOR_TYPES.includes(r.type as KnownSensorType)) {
            latestByType[r.type as KnownSensorType] = r;
          }
        }
        const hasAnomaly = live.some((r) => r.isAnomaly);
        const tier = getAlertTier(m, hasAnomaly);
        const tierStyle = TIER_STYLES[tier] ?? {};
        const tierLabel = tier > 0 ? TIER_LABELS[tier] : null;

        return (
          <div key={m.id} style={{
            background: 'var(--color-surface, #fff)', borderRadius: 14, padding: '1rem 1.25rem',
            border: `1.5px solid ${tierStyle.borderColor ?? (hasAnomaly ? '#fca5a5' : STATUS_COLORS[m.status] ?? 'var(--color-border, #e2e8f0)')}`,
            boxShadow: tierStyle.boxShadow ?? (hasAnomaly
              ? '0 0 0 2px #fee2e233, 0 2px 8px var(--color-card-shadow, rgba(0,0,0,0.06))'
              : '0 1px 4px var(--color-card-shadow, rgba(0,0,0,0.06))'),
            transition: 'all 0.2s ease',
            animation: tierStyle.animation as string | undefined,
            position: 'relative',
          }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Tier escalation badge */}
            {tierLabel && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 8, padding: '4px 8px', borderRadius: 6,
                background: tierLabel.bg, fontSize: 11, fontWeight: 700, color: tierLabel.color,
              }}>
                <span>{tierLabel.text}</span>
                {tier >= 2 && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSiren(); }}
                    style={{
                      background: 'none', border: '1px solid ' + tierLabel.color,
                      borderRadius: 4, padding: '1px 6px', fontSize: 10,
                      cursor: 'pointer', color: tierLabel.color, fontWeight: 700,
                    }}
                    title="Toggle siren sound"
                  >
                    🔊 Siren
                  </button>
                )}
              </div>
            )}
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-muted, #64748b)', marginTop: 1 }}>{m.location} · {m.model}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLORS[m.status] ?? '#888',
                               textTransform: 'uppercase', letterSpacing: '0.04em',
                               background: (STATUS_COLORS[m.status] ?? '#e2e8f0') + '18',
                               padding: '2px 8px', borderRadius: 8 }}>
                  {m.status}
                </span>
                {hasAnomaly && (
                  <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700,
                                 background: '#fee2e2', padding: '1px 6px', borderRadius: 8 }}>
                    ⚠ Anomaly
                  </span>
                )}
              </div>
            </div>

            {/* Live sensor values */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              {KNOWN_SENSOR_TYPES.map((type) => {
                const r = latestByType[type];
                const cfg = SENSOR_CONFIG[type];
                const [dMin, dMax] = cfg.domain;
                const pct = r ? Math.max(0, Math.min(100, ((r.value - dMin) / (dMax - dMin)) * 100)) : null;
                const valColor = !r ? '#94a3b8' : r.isAnomaly ? '#ef4444' : pct && pct > 80 ? '#f97316' : cfg.color;
                return (
                  <div key={type} style={{
                    background: 'var(--color-bg, #f8fafc)', borderRadius: 8, padding: '6px 8px',
                    border: r?.isAnomaly ? '1px solid #fca5a5' : '1px solid var(--color-border, #f1f5f9)',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--color-subtle, #94a3b8)', marginBottom: 2 }}>
                      {cfg.icon} {cfg.label}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: valColor }}>
                      {r ? r.value.toFixed(1) : '—'}
                      <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 2 }}>{cfg.unit}</span>
                    </div>
                    {/* Sparkline */}
                    {sparkData[m.id]?.[type]?.length > 2 && (
                      <Sparkline values={sparkData[m.id][type]} color={valColor} />
                    )}
                    {pct !== null && (
                      <div style={{ height: 2, borderRadius: 2, background: 'var(--color-border)', marginTop: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: valColor,
                                      transition: 'width 0.3s ease' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Risk score bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--color-muted, #64748b)' }}>Risk Score</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: RISK_COLORS[m.riskLevel] }}>
                  {m.riskScore.toFixed(0)}% — {m.riskLevel}
                </span>
              </div>
              <div style={{ height: 5, background: 'var(--color-border, #f1f5f9)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${m.riskScore}%`, height: '100%',
                  background: RISK_COLORS[m.riskLevel] ?? '#888',
                  borderRadius: 4, transition: 'width 0.5s ease',
                }} />
              </div>
            </div>

            {/* View link */}
            <Link to={`/monitoring?machine=${m.id}`}
              style={{ display: 'block', textAlign: 'center', padding: '8px', fontSize: 12,
                       fontWeight: 600, color: '#1a56db', background: 'rgba(26,86,219,0.08)',
                       borderRadius: 8, textDecoration: 'none', transition: 'all 0.15s',
                       border: '1px solid rgba(26,86,219,0.15)' }}>
              View Live Sensors →
            </Link>
          </div>
        );
      })}
    </div>
  );
};

export default MachineGrid;
