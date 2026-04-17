import React from 'react';
import { useBaseline } from '../../../hooks/useBaseline';

const MACHINE_IDS = ['CNC_01', 'CNC_02', 'PUMP_03', 'CONVEYOR_04'];

const MACHINE_LABELS: Record<string, { name: string; type: string }> = {
  CNC_01:      { name: 'CNC Machine #1',   type: 'CNC Mill' },
  CNC_02:      { name: 'CNC Machine #2',   type: 'CNC Lathe' },
  PUMP_03:     { name: 'Pump Station #3',  type: 'Industrial Pump' },
  CONVEYOR_04: { name: 'Conveyor Belt #4', type: 'Conveyor' },
};

const MachineHealth: React.FC<{ machineId: string }> = ({ machineId }) => {
  const { baseline, isLoading, overallHealth } = useBaseline(machineId);
  const meta = MACHINE_LABELS[machineId];

  const hColor = overallHealth === null ? '#6b7280'
    : overallHealth >= 80 ? '#16a34a' : overallHealth >= 60 ? '#d97706' : '#ef4444';
  const bar = overallHealth ?? 0;

  return (
    <div style={{ padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 10,
                  background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{meta?.name ?? machineId}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{meta?.type}</div>
        </div>
        {isLoading ? (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Analysing…</span>
        ) : (
          <span style={{ fontSize: 20, fontWeight: 800, color: hColor }}>
            {overallHealth !== null ? `${overallHealth}%` : '—'}
          </span>
        )}
      </div>
      <div style={{ height: 6, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${bar}%`, background: hColor, borderRadius: 4,
                      transition: 'width 0.6s ease' }} />
      </div>
      {baseline?.computedAt && !isLoading && (
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>
          Last computed: {new Date(baseline.computedAt).toLocaleString()}
          {' · '}{baseline.baselineWindowReadings.toLocaleString()} baseline readings
        </div>
      )}
    </div>
  );
};

const MachineConfig: React.FC = () => (
  <div>
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Machine Health Overview</h3>
      <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 0 }}>
        Health scores derived from sensor deviation against auto-computed baselines. Updates every 10 minutes.
      </p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
      {MACHINE_IDS.map((id) => <MachineHealth key={id} machineId={id} />)}
    </div>
  </div>
);

export default MachineConfig;
