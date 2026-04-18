import React from 'react';
import { useQuery } from 'react-query';
import { predictionApi } from '../../../services/api/predictionApi';
import type { RichPrediction } from '../../../types/maintenance.types';

const URGENCY_COLORS: Record<string, string> = {
  imminent: '#dc2626',
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#22c55e',
};

function hoursLabel(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`;
}

const FailurePredictionCard: React.FC<{ prediction: RichPrediction }> = ({ prediction }) => {
  const color = URGENCY_COLORS[prediction.urgency] ?? '#888';
  return (
    <div
      style={{
        border: `1px solid ${color}`,
        borderRadius: '10px',
        padding: '1.25rem',
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 700 }}>{prediction.machineName}</span>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '0.15rem 0.6rem',
            borderRadius: '9999px',
            background: `${color}22`,
            color,
          }}
        >
          {prediction.urgency.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>
        {hoursLabel(prediction.estimatedHoursRemaining)}
      </div>
      <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.4rem' }}>remaining</div>
      <div style={{ fontSize: '0.8125rem' }}><strong>Type:</strong> {prediction.failureType}</div>
      <div style={{ fontSize: '0.8125rem' }}><strong>Confidence:</strong> {(prediction.confidence * 100).toFixed(0)}%</div>
      {prediction.assignedTechnicianName && (
        <div style={{ fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600, marginTop: '0.25rem' }}>
          Assigned: {prediction.assignedTechnicianName}
        </div>
      )}
      <div
        style={{
          marginTop: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--color-muted)',
          background: 'var(--color-surface-alt)',
          borderRadius: '6px',
          padding: '0.4rem 0.6rem',
        }}
      >
        {prediction.recommendation}
      </div>
    </div>
  );
};

const PredictiveInsights: React.FC = () => {
  const { data, isLoading } = useQuery(
    'predictive-insights',
    () => predictionApi.getLive().then((r) => r.data.data),
    { refetchInterval: 30_000 }
  );

  const predictions: RichPrediction[] = (data ?? []).filter((p: RichPrediction) => p.urgency !== 'low');

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
        Predictive Insights
        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#888', marginLeft: '0.5rem' }}>
          (auto-refreshes every 30s)
        </span>
      </h3>
      {isLoading && <p>Analyzing machine data…</p>}
      {!isLoading && predictions.length === 0 && (
        <p style={{ color: '#059669' }}>No at-risk machines detected.</p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {predictions.map((p) => (
          <FailurePredictionCard key={p.machineId} prediction={p} />
        ))}
      </div>
    </div>
  );
};

export default PredictiveInsights;
