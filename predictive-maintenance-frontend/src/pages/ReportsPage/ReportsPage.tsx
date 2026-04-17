import React from 'react';
import { useMachineData } from '../../hooks/useMachineData';
import { useAlerts } from '../../hooks/useAlerts';
import { downloadJson } from '../../utils/helpers';

const ReportsPage: React.FC = () => {
  const { data: machinesData } = useMachineData();
  const { data: alertsData } = useAlerts();

  const generateReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      machines: machinesData?.items ?? [],
      alerts: alertsData?.items ?? [],
      summary: {
        totalMachines: machinesData?.total ?? 0,
        totalAlerts: alertsData?.total ?? 0,
      },
    };
    downloadJson(report, `maintenance-report-${Date.now()}.json`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Generate Report
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Export a full JSON report with machine status, alerts, and maintenance records.
        </p>
        <button
          onClick={generateReport}
          style={{
            padding: '0.625rem 1.5rem',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9375rem',
          }}
        >
          ↓ Download Report
        </button>
      </div>
    </div>
  );
};

export default ReportsPage;
