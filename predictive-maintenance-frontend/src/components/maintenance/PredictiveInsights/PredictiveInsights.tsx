import React from 'react';
import FailurePredictionCard from './FailurePredictionCard';
import { useQuery } from 'react-query';
import { maintenanceApi } from '../../../services/api/maintenanceApi';

const PredictiveInsights: React.FC = () => {
  const { data, isLoading } = useQuery('predictions', () =>
    maintenanceApi.getPredictions().then(r => r.data.data)
  );

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Predictive Insights</h3>
      {isLoading && <p>Analyzing machine data...</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {(data ?? []).map(p => (
          <FailurePredictionCard key={p.machineId} prediction={p} />
        ))}
      </div>
    </div>
  );
};

export default PredictiveInsights;
