import React from 'react';
import type { Alert } from '../../../types/alert.types';
import { SEVERITY_COLORS } from '../../../utils/constants';
import { formatRelativeTime } from '../../../utils/formatters';

interface AlertItemProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onAcknowledge, onResolve }) => {
  const color = SEVERITY_COLORS[alert.severity];

  return (
    <div
      style={{
        borderLeft: `4px solid ${color}`,
        padding: '0.75rem 1rem',
        background: 'var(--color-bg-secondary)',
        borderRadius: '0 var(--radius-md) var(--radius-md) 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.75rem',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{alert.title}</div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
          {alert.message}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {alert.machineName} · {formatRelativeTime(alert.timestamp)}
        </div>
      </div>
      {alert.status === 'active' && (
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {onAcknowledge && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              style={{
                padding: '0.25rem 0.625rem',
                fontSize: '0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              Ack
            </button>
          )}
          {onResolve && (
            <button
              onClick={() => onResolve(alert.id)}
              style={{
                padding: '0.25rem 0.625rem',
                fontSize: '0.75rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: color,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Resolve
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertItem;
