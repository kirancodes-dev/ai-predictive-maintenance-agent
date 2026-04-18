import React from 'react';
import { useQuery } from 'react-query';
import { apiClient } from '../../../services/api/apiClient';

interface TimelineEvent {
  id: string;
  type: 'alert' | 'maintenance' | 'prediction' | 'system';
  icon: string;
  color: string;
  title: string;
  detail: string;
  time: string;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ActivityTimeline: React.FC = () => {
  const { data: alerts } = useQuery('timeline-alerts', () =>
    apiClient.get('/alerts', { params: { limit: 5 } }).then(r => {
      const d = r.data?.data;
      return Array.isArray(d) ? d : d?.items || [];
    }),
    { refetchInterval: 15000 }
  );

  const { data: maintenance } = useQuery('timeline-maint', () =>
    apiClient.get('/maintenance', { params: { limit: 5 } }).then(r => {
      const d = r.data?.data;
      return Array.isArray(d) ? d : d?.items || [];
    }),
    { refetchInterval: 30000 }
  );

  // Merge and sort
  const events: TimelineEvent[] = [];

  (alerts || []).forEach((a: any) => {
    const sevColors: Record<string, string> = { critical: '#ef4444', error: '#f97316', warning: '#f59e0b', info: '#3b82f6' };
    const sevIcons: Record<string, string> = { critical: '🔴', error: '🟠', warning: '🟡', info: '🔵' };
    events.push({
      id: `alert-${a.id}`,
      type: 'alert',
      icon: sevIcons[a.severity] || '🔵',
      color: sevColors[a.severity] || '#3b82f6',
      title: a.title || `${a.severity} alert`,
      detail: `${a.machineName || a.machineId} — ${a.status}`,
      time: a.createdAt || a.timestamp || '',
    });
  });

  (maintenance || []).forEach((m: any) => {
    const statusIcons: Record<string, string> = { scheduled: '📅', in_progress: '🔧', completed: '✅' };
    events.push({
      id: `maint-${m.id}`,
      type: 'maintenance',
      icon: statusIcons[m.status] || '🔧',
      color: m.status === 'completed' ? '#22c55e' : m.status === 'in_progress' ? '#f59e0b' : '#3b82f6',
      title: m.title || 'Maintenance work order',
      detail: `${m.machineName || ''} — ${m.status?.replace('_', ' ')}`,
      time: m.scheduledDate || m.createdAt || '',
    });
  });

  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const display = events.slice(0, 10);

  return (
    <div style={{
      background: 'var(--color-surface, #fff)',
      borderRadius: 12,
      border: '1px solid var(--color-border, #e2e8f0)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--color-border, #e2e8f0)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>📋 Recent Activity</h3>
        <span style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 500 }}>
          Auto-refreshes
        </span>
      </div>

      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {display.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
            No recent activity
          </div>
        ) : (
          display.map((event, idx) => (
            <div key={event.id} style={{
              display: 'flex',
              gap: 12,
              padding: '10px 16px',
              borderBottom: idx < display.length - 1 ? '1px solid var(--color-border-light, #edf0f4)' : 'none',
              position: 'relative',
            }}>
              {/* Timeline line */}
              {idx < display.length - 1 && (
                <div style={{
                  position: 'absolute',
                  left: 27,
                  top: 30,
                  bottom: -2,
                  width: 2,
                  background: 'var(--color-border, #e5e7eb)',
                }} />
              )}
              {/* Icon dot */}
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: `${event.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                flexShrink: 0,
                zIndex: 1,
                border: `2px solid ${event.color}30`,
              }}>
                {event.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3 }}>
                  {event.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>
                  {event.detail}
                </div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--color-subtle, #94a3b8)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {event.time ? timeAgo(event.time) : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;
