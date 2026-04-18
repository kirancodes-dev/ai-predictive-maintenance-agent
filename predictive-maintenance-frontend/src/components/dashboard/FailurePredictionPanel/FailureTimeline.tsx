import React from 'react';
import type { RichPrediction } from '../../../types/maintenance.types';

interface Props {
  predictions: RichPrediction[];
}

const URGENCY_COLORS: Record<string, string> = {
  imminent: '#dc2626',
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  const d = Math.floor(h / 24);
  const rem = Math.round(h % 24);
  return rem > 0 ? `${d}d ${rem}h` : `${d}d`;
}

const FailureTimeline: React.FC<Props> = ({ predictions }) => {
  if (!predictions.length) return null;

  const sorted = [...predictions].sort(
    (a, b) => a.estimatedHoursRemaining - b.estimatedHoursRemaining,
  );

  const maxHours = Math.max(...sorted.map((p) => p.estimatedHoursRemaining), 24);
  // Snap timeline max to next "nice" boundary
  const timelineMax =
    maxHours <= 6 ? 6 : maxHours <= 12 ? 12 : maxHours <= 24 ? 24 : maxHours <= 48 ? 48 : maxHours <= 72 ? 72 : maxHours <= 168 ? 168 : Math.ceil(maxHours / 24) * 24;

  // Generate tick marks
  const ticks: number[] = [];
  const step = timelineMax <= 12 ? 2 : timelineMax <= 24 ? 4 : timelineMax <= 48 ? 8 : timelineMax <= 72 ? 12 : 24;
  for (let t = 0; t <= timelineMax; t += step) ticks.push(t);

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 12,
      padding: '1.25rem',
      border: '1px solid var(--color-border)',
      marginTop: '1rem',
    }}>
      <h3 style={{
        fontSize: '0.875rem', fontWeight: 700, margin: '0 0 1rem',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>⏱</span>
        Failure Prediction Timeline
        <span style={{
          fontSize: 11, fontWeight: 400, color: 'var(--color-muted)',
          marginLeft: 'auto',
        }}>
          Estimated time to failure
        </span>
      </h3>

      {/* Danger zone overlay */}
      <div style={{ position: 'relative', minHeight: sorted.length * 40 + 30 }}>
        {/* Danger zone: 0-6h */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: `${Math.min(100, (6 / timelineMax) * 100)}%`,
          height: '100%',
          background: 'rgba(239, 68, 68, 0.04)',
          borderRight: '1px dashed rgba(239, 68, 68, 0.3)',
          borderRadius: '8px 0 0 8px',
          pointerEvents: 'none',
        }} />

        {/* Tick marks */}
        {ticks.map((t) => (
          <div key={t} style={{
            position: 'absolute',
            left: `${(t / timelineMax) * 100}%`,
            top: 0,
            height: '100%',
            borderLeft: '1px solid var(--color-border)',
            opacity: 0.5,
            pointerEvents: 'none',
          }}>
            <span style={{
              position: 'absolute',
              bottom: 0,
              left: 4,
              fontSize: 10,
              color: 'var(--color-muted)',
              whiteSpace: 'nowrap',
            }}>
              {formatHours(t)}
            </span>
          </div>
        ))}

        {/* Machine rows */}
        {sorted.map((p, i) => {
          const pct = Math.min(100, (p.estimatedHoursRemaining / timelineMax) * 100);
          const color = URGENCY_COLORS[p.urgency] ?? '#94a3b8';
          return (
            <div key={p.machineId} style={{
              position: 'absolute',
              top: i * 40 + 4,
              left: 0,
              right: 0,
              height: 32,
              display: 'flex',
              alignItems: 'center',
            }}>
              {/* Machine label */}
              <div style={{
                position: 'absolute',
                left: `${Math.max(2, pct - 1)}%`,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                zIndex: 1,
              }}>
                {/* Marker dot */}
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: color,
                  border: '2px solid var(--color-surface)',
                  boxShadow: `0 0 0 2px ${color}40`,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--color-text)',
                  whiteSpace: 'nowrap',
                  background: 'var(--color-surface)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}>
                  {p.machineName}
                  <span style={{ color, fontWeight: 700, marginLeft: 6 }}>
                    {formatHours(p.estimatedHoursRemaining)}
                  </span>
                </span>
              </div>

              {/* Progress bar to marker */}
              <div style={{
                position: 'absolute',
                left: 0,
                width: `${pct}%`,
                height: 4,
                borderRadius: 2,
                background: `linear-gradient(90deg, ${color}, ${color}80)`,
                opacity: 0.6,
              }} />
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, marginTop: 8, paddingTop: 8,
        borderTop: '1px solid var(--color-border)',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 10, color: 'rgba(239, 68, 68, 0.7)', fontWeight: 600 }}>
          ← Danger Zone (0–6h)
        </div>
        {['imminent', 'critical', 'high', 'medium', 'low'].map((u) => (
          <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: URGENCY_COLORS[u] }} />
            <span style={{ color: 'var(--color-muted)', textTransform: 'capitalize' }}>{u}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FailureTimeline;
