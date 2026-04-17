import React, { useEffect, useState } from 'react';
import type { RichPrediction } from '../../../types/maintenance.types';

const URGENCY_CONFIG = {
  imminent: { color: '#dc2626', bg: '#fef2f2', label: 'IMMINENT', pulse: true },
  critical:  { color: '#ef4444', bg: '#fef2f2', label: 'CRITICAL', pulse: true },
  high:      { color: '#f97316', bg: '#fff7ed', label: 'HIGH', pulse: false },
  medium:    { color: '#f59e0b', bg: '#fffbeb', label: 'MEDIUM', pulse: false },
  low:       { color: '#22c55e', bg: '#f0fdf4', label: 'LOW', pulse: false },
};

function formatCountdown(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  const days = Math.floor(hours / 24);
  const remH = Math.round(hours % 24);
  return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
}

interface Props {
  prediction: RichPrediction;
}

const FailurePredictionCard: React.FC<Props> = ({ prediction }) => {
  const cfg = URGENCY_CONFIG[prediction.urgency] ?? URGENCY_CONFIG.low;
  // Live countdown — decrements every minute
  const [hoursLeft, setHoursLeft] = useState(prediction.estimatedHoursRemaining);

  useEffect(() => {
    setHoursLeft(prediction.estimatedHoursRemaining);
    const timer = setInterval(() => {
      setHoursLeft((h) => Math.max(0, h - 1 / 60));
    }, 60_000);
    return () => clearInterval(timer);
  }, [prediction.estimatedHoursRemaining]);

  return (
    <div
      style={{
        border: `2px solid ${cfg.color}`,
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        background: 'var(--color-surface, #fff)',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: `4px solid ${cfg.color}`,
        animation: cfg.pulse ? 'pulse-border 2s infinite' : undefined,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Urgency badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text, #111)' }}>
          {prediction.machineName}
        </span>
        <span
          style={{
            padding: '0.2rem 0.75rem',
            borderRadius: '9999px',
            background: cfg.color,
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.05em',
          }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Big countdown */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '2rem', fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
          {formatCountdown(hoursLeft)}
        </span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted, #555)' }}>until predicted failure</span>
      </div>

      {/* Details */}
      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text, #444)', lineHeight: 1.6 }}>
        <div><strong>Failure type:</strong> {prediction.failureType}</div>
        <div><strong>Confidence:</strong> {(prediction.confidence * 100).toFixed(0)}%</div>
        {prediction.assignedTechnicianName && (
          <div style={{ color: '#059669', fontWeight: 600 }}>
            Assigned: {prediction.assignedTechnicianName}
          </div>
        )}
        {!prediction.assignedTechnicianName && prediction.urgency !== 'low' && (
          <div style={{ color: '#f59e0b', fontWeight: 600 }}>Awaiting technician assignment…</div>
        )}
        {prediction.workOrderId && (
          <div style={{ color: '#6366f1' }}>Work order auto-created</div>
        )}
      </div>

      {/* Recommendation */}
      <div
        style={{
          marginTop: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--color-muted, #555)',
          background: 'var(--color-bg, rgba(0,0,0,0.04))',
          borderRadius: '6px',
          padding: '0.4rem 0.6rem',
        }}
      >
        {prediction.recommendation}
      </div>
    </div>
  );
};

export default FailurePredictionCard;
