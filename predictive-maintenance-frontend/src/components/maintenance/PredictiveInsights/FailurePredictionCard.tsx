import React from 'react';
import type { FailurePrediction } from '../../../types/maintenance.types';
import { formatDate } from '../../../utils/formatters';

interface FailurePredictionCardProps {
  prediction: FailurePrediction;
}

const urgencyColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const FailurePredictionCard: React.FC<FailurePredictionCardProps> = ({ prediction }) => {
  const color = urgencyColors[prediction.urgency];

  return (
    <div
      style={{
        border: `1px solid ${color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{prediction.machineName}</span>
        <span
          style={{
            padding: '0.125rem 0.625rem',
            borderRadius: '9999px',
            background: `${color}22`,
            color,
            fontWeight: 700,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
          }}
        >
          {prediction.urgency}
        </span>
      </div>
      <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
        <strong>Failure type:</strong> {prediction.failureType}
      </div>
      <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
        <strong>Predicted date:</strong> {formatDate(prediction.predictedFailureDate)}
      </div>
      <div style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
        <strong>Confidence:</strong> {(prediction.confidence * 100).toFixed(0)}%
      </div>
      <div
        style={{
          fontSize: '0.8125rem',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem',
        }}
      >
        💡 {prediction.recommendation}
      </div>
    </div>
  );
};

export default FailurePredictionCard;
