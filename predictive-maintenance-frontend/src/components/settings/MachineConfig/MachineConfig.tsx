import React from 'react';
import { useBaseline } from '../../../hooks/useBaseline';

const MACHINE_IDS = ['CNC_01', 'CNC_02', 'PUMP_03', 'CONVEYOR_04'];

const MACHINE_LABELS: Record<string, string> = {
  CNC_01: 'CNC Machine 1',
  CNC_02: 'CNC Machine 2',
  PUMP_03: 'Pump Station 3',
  CONVEYOR_04: 'Conveyor Belt 4',
};

const MachineHealth: React.FC<{ machineId: string }> = ({ machineId }) => {
  const { baseline, isLoading, overallHealth } = useBaseline(machineId);

  const healthColor = overallHealth === null ? '#6b7280'
    : overallHealth >= 80 ? '#16a34a'
    : overallHealth >= 60 ? '#d97706' : '#ef4444';

  const bar = overallHealth ?? 0;

  return (
    <div style={{
      padding: '12px 16px',
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      background: 'var(--color-surface)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{machineId}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{MACHINE_LABELS[machineId]}</div>
        </div>
        {isLoading ? (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Analysing…</span>
        ) : (
          <span style={{ fontSize: 18, fontWeight: 800, color: healthColor }}>
            {overallHealth !== null ? `${overallHealth}%` : '—'}
          </span>
        )}
      </div>

      {/* Health bar */}
      <div style={{
        height: 6, borderRadius: 4, background: 'var(--color-border)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${bar}%`,
          background: healthColor,
          borderRadius: 4,
          transition: 'width 0.6s ease',
        }} />
      </div>

      {baseline?.computedAt && !isLoading && (
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 6 }}>
          Last computed: {new Date(baseline.computedAt).toLocaleString()}
          {' · '}
          {baseline.baselineWindowReadings.toLocaleString()} baseline readings
        </div>
      )}
    </div>
  );
};

const MachineConfig: React.FC = () => (
  <div>
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
        Machine Health Overview
      </h3>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, marginBottom: 0 }}>
        Overall health scores are derived from sensor deviation against auto-computed baselines.
        Scores update every 10 minutes.
      </p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
      {MACHINE_IDS.map((id) => (
        <MachineHealth key={id} machineId={id} />
      ))}
    </div>
  </div>
);

export default MachineConfig;
