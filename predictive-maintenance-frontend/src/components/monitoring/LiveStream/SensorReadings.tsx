import React, { useMemo } from 'react';
import { SENSOR_CONFIG, KNOWN_SENSOR_TYPES, type KnownSensorType } from '../charts/chartConfig';
import type { SensorReading } from '../../../hooks/useStreamData';

interface Props {
  readings: SensorReading[];
}

const SensorReadings: React.FC<Props> = ({ readings }) => {
  const latest = useMemo<Record<KnownSensorType, SensorReading | undefined>>(() => {
    const map = {} as Record<KnownSensorType, SensorReading | undefined>;
    for (const r of readings) {
      if (KNOWN_SENSOR_TYPES.includes(r.type as KnownSensorType)) {
        map[r.type as KnownSensorType] = r;
      }
    }
    return map;
  }, [readings]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {KNOWN_SENSOR_TYPES.map((type) => {
        const r = latest[type];
        const cfg = SENSOR_CONFIG[type];
        const [dMin, dMax] = cfg.domain;
        const pct = r ? Math.max(0, Math.min(100, ((r.value - dMin) / (dMax - dMin)) * 100)) : 0;
        const isHot = pct > 80;
        const isWarm = pct > 60 && !isHot;
        const statusColor = !r ? 'var(--color-muted)' : isHot ? '#ef4444' : isWarm ? '#f59e0b' : cfg.color;

        return (
          <div key={type} style={{
            background: 'var(--color-surface)', borderRadius: 12, padding: '14px 16px',
            border: `1.5px solid ${r?.isAnomaly ? '#fca5a5' : 'var(--color-border)'}`,
            boxShadow: r?.isAnomaly ? '0 0 0 2px rgba(239,68,68,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'border-color 0.3s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                {cfg.label}
              </span>
              {r?.isAnomaly && (
                <span style={{ fontSize: 10, background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                               borderRadius: 8, padding: '1px 6px', fontWeight: 700 }}>
                  ⚠ ANOMALY
                </span>
              )}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: statusColor, lineHeight: 1, marginBottom: 6 }}>
              {r ? r.value.toFixed(2) : '—'}
              <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 4, color: 'var(--color-muted)' }}>
                {cfg.unit}
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 4, borderRadius: 4, background: 'var(--color-surface-alt)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: statusColor, borderRadius: 4,
                transition: 'width 0.4s ease, background 0.3s ease',
              }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 4 }}>
              {r ? `${pct.toFixed(0)}% of range` : 'No data'}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SensorReadings;
