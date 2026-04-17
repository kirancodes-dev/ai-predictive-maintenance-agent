import React, { useState } from 'react';
import { useMachineData } from '../../hooks/useMachineData';
import LiveStream from '../../components/monitoring/LiveStream';
import { STATUS_COLORS } from '../../utils/constants';

const LiveMonitoringPage: React.FC = () => {
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
          Live Monitoring
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
          Real-time sensor streams — individual and combined charts
        </p>
      </div>

      {/* Machine selector tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {machines.map((m) => {
          const statusColor = STATUS_COLORS[m.status] ?? '#6b7280';
          const isActive = m.id === selected;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
                border: isActive ? `2px solid ${statusColor}` : '1px solid var(--color-border)',
                background: isActive ? `${statusColor}18` : 'var(--color-surface)',
                color: isActive ? statusColor : 'var(--color-text-secondary)',
                boxShadow: isActive ? `0 0 0 3px ${statusColor}22` : 'none',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%',
                             background: statusColor, flexShrink: 0,
                             boxShadow: isActive ? `0 0 6px ${statusColor}` : 'none' }} />
              <span>{m.name}</span>
              <span style={{ fontSize: 10, background: `${statusColor}22`, color: statusColor,
                             borderRadius: 8, padding: '1px 7px', fontWeight: 700,
                             textTransform: 'uppercase' }}>
                {m.status}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stream panel */}
      {selected && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 14, padding: '20px 24px' }}>
          <LiveStream
            machineId={selected}
            machineName={selectedMachine?.name}
          />
        </div>
      )}
    </div>
  );
};

export default LiveMonitoringPage;
