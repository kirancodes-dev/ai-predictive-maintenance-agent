import React from 'react';
import { useNotificationContext } from '../../../context/NotificationContext';

const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useNotificationContext();

  const colors: Record<string, string> = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        zIndex: 9999,
      }}
    >
      {notifications.map(n => (
        <div
          key={n.id}
          style={{
            background: 'var(--color-surface)',
            border: `1px solid ${colors[n.type]}`,
            borderLeft: `4px solid ${colors[n.type]}`,
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            minWidth: 280,
            maxWidth: 400,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{n.title}</div>
            {n.message && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {n.message}
              </div>
            )}
          </div>
          <button
            onClick={() => removeNotification(n.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
