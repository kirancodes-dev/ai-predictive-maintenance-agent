import React, { useState } from 'react';
import { useMachineData } from '../../hooks/useMachineData';
import HistoryView from '../../components/monitoring/HistoryView';
import { STATUS_COLORS } from '../../utils/constants';

const HistoryPage: React.FC = () => {
  const { data, isLoading } = useMachineData();
  const machines = data?.items ?? [];
  const [selectedId, setSelectedId] = useState<string>('');
  const selected = selectedId || machines[0]?.id;
  const selectedMachine = machines.find((m) => m.id === selected);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 200, color: 'var(--color-text-muted)', fontSize: 14 }}>
        Loading machines…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page title */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
          Sensor History
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
          7-day historical data — per sensor and combined view with export
        </p>
      </div>

      {/* Machine selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          Machine:
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {machines.map((m) => {
            const statusColor = STATUS_COLORS[m.status] ?? '#6b7280';
            const isActive = m.id === selected;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                  fontWeight: 600, fontSize: 12, transition: 'all 0.15s',
                  border: isActive ? `2px solid ${statusColor}` : '1px solid var(--color-border)',
                  background: isActive ? `${statusColor}15` : 'var(--color-surface)',
                  color: isActive ? statusColor : 'var(--color-text-secondary)',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%',
                               background: statusColor }} />
                {m.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* History panel */}
      {selected && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 14, padding: '20px 24px' }}>
          <HistoryView
            machineId={selected}
            machineName={selectedMachine?.name}
          />
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
