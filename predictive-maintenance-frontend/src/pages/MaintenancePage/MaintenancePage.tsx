import React from 'react';
import MaintenanceHistory from '../../components/maintenance/MaintenanceHistory';
import PredictiveInsights from '../../components/maintenance/PredictiveInsights';

const MaintenancePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <PredictiveInsights />
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        }}
      >
        <MaintenanceHistory />
      </div>
    </div>
  );
};

export default MaintenancePage;
