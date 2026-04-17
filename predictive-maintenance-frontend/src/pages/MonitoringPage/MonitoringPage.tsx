import React, { useState, useEffect } from 'react';
import LiveStream from '../../components/monitoring/LiveStream/LiveStream';
import HistoryView from '../../components/monitoring/HistoryView/HistoryView';

const MACHINES = [
  { id: 'CNC_01',      name: 'CNC Machine #1',   type: 'CNC Mill',         icon: '🔩', risk: 'high' },
  { id: 'CNC_02',      name: 'CNC Machine #2',   type: 'CNC Lathe',        icon: '⚙️', risk: 'medium' },
  { id: 'PUMP_03',     name: 'Pump Station #3',  type: 'Industrial Pump',  icon: '💧', risk: 'critical' },
  { id: 'CONVEYOR_04', name: 'Conveyor Belt #4', type: 'Conveyor Belt',    icon: '🏗️', risk: 'low' },
];

const RISK_COLORS: Record<string, string> = {
  low: '#16a34a', medium: '#d97706', high: '#f97316', critical: '#ef4444',
};

const MonitoringPage: React.FC = () => {
  const [activeMachine, setActiveMachine] = useState(MACHINES[0].id);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [now, setNow] = useState(new Date());

  // Live clock for real-time feel
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const machine = MACHINES.find((m) => m.id === activeMachine) ?? MACHINES[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page header with live clock */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Real-Time Machine Monitor
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-muted)' }}>
            Live sensor data with auto-computed baselines
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--color-sidebar, #111827)', borderRadius: 10, padding: '8px 16px',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#059669',
            display: 'inline-block', boxShadow: '0 0 6px rgba(5,150,105,0.5)',
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>LIVE</span>
          <span style={{ color: '#e5e7eb', fontSize: 15, fontWeight: 600, fontFamily: 'monospace', minWidth: 76, textAlign: 'center' }}>
            {now.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Machine selector cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {MACHINES.map((m) => {
          const isActive = activeMachine === m.id;
          return (
            <button key={m.id} onClick={() => setActiveMachine(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 20px', borderRadius: 14, cursor: 'pointer',
                border: `2.5px solid ${isActive ? RISK_COLORS[m.risk] : '#e2e8f0'}`,
                background: isActive ? `${RISK_COLORS[m.risk]}10` : '#fff',
                boxShadow: isActive ? `0 0 0 3px ${RISK_COLORS[m.risk]}18, 0 4px 12px rgba(0,0,0,0.08)` : '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.2s',
              }}>
              <span style={{ fontSize: 24 }}>{m.icon}</span>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14,
                              color: isActive ? RISK_COLORS[m.risk] : '#0f172a' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{m.type}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 12,
                background: RISK_COLORS[m.risk] + '22', color: RISK_COLORS[m.risk],
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {m.risk}
              </span>
            </button>
          );
        })}
      </div>

      {/* Live / History tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0' }}>
        {(['live', 'history'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 24px', fontSize: 14, fontWeight: 700, border: 'none',
              background: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab ? '3px solid #3b82f6' : '3px solid transparent',
              marginBottom: -2, color: activeTab === tab ? '#3b82f6' : '#64748b',
              transition: 'all 0.15s',
            }}>
            {tab === 'live' ? 'Live Stream' : 'Historical Data'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'live' ? (
          <LiveStream key={activeMachine} machineId={activeMachine} machineName={machine.name} />
        ) : (
          <HistoryView key={activeMachine} machineId={activeMachine} machineName={machine.name} />
        )}
      </div>
    </div>
  );
};

export default MonitoringPage;
