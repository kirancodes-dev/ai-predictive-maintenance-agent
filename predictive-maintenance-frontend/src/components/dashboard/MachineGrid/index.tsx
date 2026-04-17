import React from 'react';
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

interface Props {
  machines: Machine[];
  isLoading: boolean;
  liveData?: Record<string, SensorReadingDto[]>;
}

const MachineGrid: React.FC<Props> = ({ machines, isLoading, liveData = {} }) => {
  if (isLoading) return <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading machines…</p>;
  if (!machines.length) return <p style={{ color: '#94a3b8', fontSize: 13 }}>No machines found.</p>;

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

        return (
          <div key={m.id} style={{
            background: '#fff', borderRadius: 12, padding: '1rem 1.25rem',
            border: `1.5px solid ${hasAnomaly ? '#fca5a5' : STATUS_COLORS[m.status] ?? '#e2e8f0'}`,
            boxShadow: hasAnomaly ? '0 0 0 2px #fee2e233, 0 2px 8px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.06)',
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{m.location} · {m.model}</div>
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
                    background: '#f8fafc', borderRadius: 8, padding: '6px 8px',
                    border: r?.isAnomaly ? '1px solid #fca5a5' : '1px solid #f1f5f9',
                  }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>
                      {cfg.icon} {cfg.label}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: valColor }}>
                      {r ? r.value.toFixed(1) : '—'}
                      <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 2 }}>{cfg.unit}</span>
                    </div>
                    {pct !== null && (
                      <div style={{ height: 2, borderRadius: 2, background: '#e2e8f0', marginTop: 3, overflow: 'hidden' }}>
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
                <span style={{ fontSize: 11, color: '#64748b' }}>Risk Score</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: RISK_COLORS[m.riskLevel] }}>
                  {m.riskScore.toFixed(0)}% — {m.riskLevel}
                </span>
              </div>
              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${m.riskScore}%`, height: '100%',
                  background: RISK_COLORS[m.riskLevel] ?? '#888',
                  borderRadius: 4, transition: 'width 0.5s ease',
                }} />
              </div>
            </div>

            {/* View link */}
            <Link to={`/monitoring?machine=${m.id}`}
              style={{ display: 'block', textAlign: 'center', padding: '6px', fontSize: 12,
                       fontWeight: 600, color: '#3b82f6', background: '#eff6ff',
                       borderRadius: 7, textDecoration: 'none', transition: 'background 0.15s' }}>
              View Live Sensors →
            </Link>
          </div>
        );
      })}
    </div>
  );
};

export default MachineGrid;
