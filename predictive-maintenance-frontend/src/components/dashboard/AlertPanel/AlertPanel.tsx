import React from 'react';
import AlertItem from './AlertItem';
import type { Alert } from '../../../types/alert.types';

interface AlertPanelProps {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  maxItems?: number;
}

const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts,
  onAcknowledge,
  onResolve,
  maxItems = 10,
}) => {
  const displayed = alerts.slice(0, maxItems);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Active Alerts</h3>
        <span
          style={{
            background: 'var(--color-error)',
            color: '#fff',
            borderRadius: '9999px',
            padding: '0.125rem 0.5rem',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {alerts.length}
        </span>
      </div>
      {displayed.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          No active alerts.
        </p>
      ) : (
        displayed.map(alert => (
          <AlertItem
            key={alert.id}
            alert={alert}
            onAcknowledge={onAcknowledge}
            onResolve={onResolve}
          />
        ))
      )}
    </div>
  );
};

export default AlertPanel;
