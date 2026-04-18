import React from 'react';
import type { Alert } from '../../../types/alert.types';

const SEV_COLORS: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  info:     { border: '#1a56db', bg: 'rgba(26,86,219,0.1)', text: '#1d4ed8', icon: 'i' },
  warning:  { border: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: '#b45309', icon: '!' },
  error:    { border: '#f97316', bg: 'rgba(249,115,22,0.1)', text: '#c2410c', icon: '!!' },
  critical: { border: '#dc2626', bg: 'rgba(239,68,68,0.1)', text: '#dc2626', icon: '!!!' },
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active:       { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', label: 'Active' },
  acknowledged: { bg: 'rgba(26,86,219,0.1)', text: '#1a56db', label: 'Acknowledged' },
  resolved:     { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', label: 'Resolved' },
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Props {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  maxHeight?: string;
  title?: string;
}

const AlertPanel: React.FC<Props> = ({
  alerts,
  onAcknowledge,
  onResolve,
  maxHeight = '520px',
  title = 'Active Alerts',
}) => (
  <div style={{
    background: 'var(--color-surface, #fff)',
    borderRadius: 12,
    border: '1px solid var(--color-border, #e2e8f0)',
    overflow: 'hidden',
  }}>
    {/* Header */}
    <div style={{
      padding: '14px 16px',
      borderBottom: '1px solid var(--color-border, #e2e8f0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{title}</h2>
      {alerts.length > 0 && (
        <span style={{
          background: alerts.some((a) => a.severity === 'critical') ? '#ef4444' : '#f59e0b',
          color: '#fff',
          borderRadius: 12,
          padding: '2px 10px',
          fontSize: 11,
          fontWeight: 700,
        }}>
          {alerts.length}
        </span>
      )}
    </div>

    {/* Alert list */}
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      maxHeight,
      overflowY: 'auto',
    }}>
      {alerts.length === 0 && (
        <div style={{
          padding: '2rem 1rem',
          textAlign: 'center',
          color: 'var(--color-muted, #94a3b8)',
        }}>
          <div style={{ fontSize: 14, marginBottom: 8, color: '#059669', fontWeight: 600 }}>✓</div>
          <div style={{ fontSize: 13 }}>No alerts — all systems nominal</div>
        </div>
      )}

      {alerts.map((a) => {
        const sev = SEV_COLORS[a.severity] ?? SEV_COLORS.info;
        const status = STATUS_BADGE[a.status] ?? STATUS_BADGE.active;
        const isCritical = a.severity === 'critical' && a.status === 'active';

        return (
          <div
            key={a.id}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border, #e2e8f0)',
              borderLeft: `4px solid ${sev.border}`,
              background: isCritical ? sev.bg : 'transparent',
              transition: 'background 0.2s',
            }}
          >
            {/* Top row: severity icon + title + time */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{sev.icon}</span>
                <span style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--color-text, #1e293b)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {a.title}
                </span>
              </div>
              <span style={{
                fontSize: 10,
                color: 'var(--color-muted, #94a3b8)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {timeAgo(a.timestamp)}
              </span>
            </div>

            {/* Machine name + severity/status badges */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}>
              <span style={{ fontSize: 11, color: 'var(--color-muted, #64748b)' }}>
                {a.machineName}
              </span>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                background: sev.bg,
                color: sev.text,
                padding: '1px 6px',
                borderRadius: 4,
              }}>
                {a.severity}
              </span>
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                background: status.bg,
                color: status.text,
                padding: '1px 6px',
                borderRadius: 4,
              }}>
                {status.label}
              </span>
            </div>

            {/* Message */}
            <div style={{
              fontSize: 11,
              color: 'var(--color-muted, #64748b)',
              marginBottom: a.status !== 'resolved' ? 8 : 0,
              lineHeight: 1.4,
            }}>
              {a.message}
            </div>

            {/* Value if present */}
            {a.value !== undefined && a.value !== null && (
              <div style={{
                fontSize: 10,
                color: sev.text,
                fontFamily: 'monospace',
                marginBottom: 6,
              }}>
                Sensor value: {a.value}
              </div>
            )}

            {/* Action buttons */}
            {a.status !== 'resolved' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {a.status === 'active' && (
                  <button
                    onClick={() => onAcknowledge(a.id)}
                    style={{
                      fontSize: 11,
                      padding: '4px 12px',
                      border: '1px solid #6366f1',
                      borderRadius: 6,
                      background: 'rgba(99,102,241,0.1)',
                      color: '#6366f1',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#6366f1';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
                      e.currentTarget.style.color = '#6366f1';
                    }}
                  >
                    ✓ Acknowledge
                  </button>
                )}
                <button
                  onClick={() => onResolve(a.id)}
                  style={{
                    fontSize: 11,
                    padding: '4px 12px',
                    border: '1px solid #22c55e',
                    borderRadius: 6,
                    background: 'rgba(34,197,94,0.1)',
                    color: '#16a34a',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#22c55e';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(34,197,94,0.1)';
                    e.currentTarget.style.color = '#16a34a';
                  }}
                >
                  ✓ Resolve
                </button>
              </div>
            )}

            {/* Acknowledged info */}
            {a.acknowledgedBy && (
              <div style={{ fontSize: 10, color: 'var(--color-muted, #94a3b8)', marginTop: 4 }}>
                Acknowledged by {a.acknowledgedBy}
                {a.acknowledgedAt && ` · ${timeAgo(a.acknowledgedAt)}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default AlertPanel;
