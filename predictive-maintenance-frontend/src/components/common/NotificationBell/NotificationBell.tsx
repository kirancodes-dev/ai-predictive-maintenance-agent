import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlerts, useAlertSummary } from '../../../hooks/useAlerts';
import './NotificationBell.css';

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: summary } = useAlertSummary();
  const { data } = useAlerts({ limit: 8, status: ['active'] });
  const alerts = data?.items ?? [];
  const unread = summary?.active ?? 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const severityIcon = (s: string) => {
    switch (s) {
      case 'critical': return '🔴';
      case 'error': return '🟠';
      case 'warning': return '🟡';
      default: return '🔵';
    }
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="notif-bell" ref={ref}>
      <button className="notif-bell__btn" onClick={() => setOpen(!open)} aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="notif-bell__badge">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-bell__dropdown">
          <div className="notif-bell__header">
            <span className="notif-bell__title">Notifications</span>
            {unread > 0 && <span className="notif-bell__count">{unread} active</span>}
          </div>
          <div className="notif-bell__list">
            {alerts.length === 0 ? (
              <div className="notif-bell__empty">No active alerts</div>
            ) : (
              alerts.map((a) => (
                <button
                  key={a.id}
                  className="notif-bell__item"
                  onClick={() => { setOpen(false); navigate('/alerts'); }}
                >
                  <span className="notif-bell__icon">{severityIcon(a.severity)}</span>
                  <div className="notif-bell__content">
                    <div className="notif-bell__msg">{a.message}</div>
                    <div className="notif-bell__meta">
                      {a.machineName || a.machineId} · {timeAgo(a.createdAt)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <button className="notif-bell__footer" onClick={() => { setOpen(false); navigate('/alerts'); }}>
            View all alerts →
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
