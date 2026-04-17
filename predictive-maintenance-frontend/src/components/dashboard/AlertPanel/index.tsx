import React from 'react';
import type { Alert } from '../../../types/alert.types';

const SEV_COLORS: Record<string, string> = {
  info:     '#3b82f6',
  warning:  '#f59e0b',
  error:    '#f97316',
  critical: '#ef4444',
};

interface Props {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}

const AlertPanel: React.FC<Props> = ({ alerts, onAcknowledge, onResolve }) => (
  <div>
    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>🚨 Active Alerts</h2>
    {alerts.length === 0 && <p style={{ color: '#888', fontSize: '0.875rem' }}>No active alerts.</p>}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
      {alerts.map((a) => (
        <div
          key={a.id}
          style={{
            border: `1px solid ${SEV_COLORS[a.severity] ?? '#e2e8f0'}`,
            borderLeft: `4px solid ${SEV_COLORS[a.severity] ?? '#e2e8f0'}`,
            borderRadius: '8px',
            padding: '0.75rem',
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{a.title}</div>
          <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '0.5rem' }}>{a.machineName}</div>
          <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>{a.message}</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {a.status === 'active' && (
              <button
                onClick={() => onAcknowledge(a.id)}
                style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  border: '1px solid #6366f1',
                  borderRadius: '4px',
                  background: '#eef2ff',
                  color: '#6366f1',
                  cursor: 'pointer',
                }}
              >
                Acknowledge
              </button>
            )}
            <button
              onClick={() => onResolve(a.id)}
              style={{
                fontSize: '0.7rem',
                padding: '0.2rem 0.5rem',
                border: '1px solid #22c55e',
                borderRadius: '4px',
                background: '#f0fdf4',
                color: '#16a34a',
                cursor: 'pointer',
              }}
            >
              Resolve
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AlertPanel;
