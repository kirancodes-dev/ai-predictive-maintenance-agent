import React from 'react';
import { useQuery } from 'react-query';
import { predictionApi } from '../../../services/api/predictionApi';
import FailurePredictionCard from './FailurePredictionCard';
import FailureTimeline from './FailureTimeline';
import type { RichPrediction } from '../../../types/maintenance.types';

const FailurePredictionPanel: React.FC = () => {
  const { data, isLoading, isFetching } = useQuery(
    'predictions-live',
    () => predictionApi.getLive().then((r) => r.data.data),
    { refetchInterval: 30_000 }
  );

  const predictions: RichPrediction[] = data ?? [];
  // Show urgent ones first; filter out very low risk if many results
  const urgent = predictions.filter((p) => p.urgency !== 'low');
  const shown = urgent.length > 0 ? urgent : predictions.slice(0, 4);

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          Failure Predictions
        </h2>
        {isFetching && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted, #888)' }}>Refreshing…</span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.75rem',
            color: '#6366f1',
            background: '#eef2ff',
            padding: '0.15rem 0.6rem',
            borderRadius: '9999px',
          }}
        >
          Automated · updates every 30s
        </span>
      </div>

      {isLoading && <p style={{ color: 'var(--color-muted, #888)', fontSize: '0.875rem' }}>Analyzing machine health…</p>}

      {!isLoading && shown.length === 0 && (
        <p style={{ color: '#059669', fontSize: '0.875rem' }}>All machines are operating within normal parameters.</p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {shown.map((p) => (
          <FailurePredictionCard key={p.machineId} prediction={p} />
        ))}
      </div>

      {urgent.length === 0 && predictions.length > 0 && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-muted, #888)' }}>
          {predictions.length} machine(s) monitored — all within safe operational range.
        </p>
      )}

      {/* Visual timeline showing time-to-failure for all predictions */}
      {predictions.length > 0 && <FailureTimeline predictions={predictions} />}
    </section>
  );
};

export default FailurePredictionPanel;
