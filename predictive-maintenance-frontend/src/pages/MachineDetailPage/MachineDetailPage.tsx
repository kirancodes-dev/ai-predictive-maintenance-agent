import React from 'react';
import { useParams } from 'react-router-dom';
import { useMachineDetail } from '../../hooks/useMachineData';
import RiskIndicator from '../../components/dashboard/RiskIndicator';
import LiveStream from '../../components/monitoring/LiveStream';
import AnomalyDetection from '../../components/monitoring/AnomalyDetection';
import { STATUS_COLORS } from '../../utils/constants';

const MachineDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { data: machine, isLoading } = useMachineDetail(id);

  if (isLoading) return <p>Loading machine details...</p>;
  if (!machine) return <p>Machine not found.</p>;

  const statusColor = STATUS_COLORS[machine.status];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{machine.name}</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {machine.model} · {machine.location}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              padding: '0.375rem 1rem',
              borderRadius: '9999px',
              background: `${statusColor}22`,
              color: statusColor,
              fontWeight: 700,
              fontSize: '0.875rem',
              textTransform: 'capitalize',
            }}
          >
            {machine.status}
          </span>
          <RiskIndicator score={machine.riskScore} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Live Data</h2>
          <LiveStream machineId={id} />
        </div>
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
          }}
        >
          <AnomalyDetection machineId={id} />
        </div>
      </div>
    </div>
  );
};

export default MachineDetailPage;
