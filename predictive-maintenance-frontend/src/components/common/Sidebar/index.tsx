import React from 'react';
import { NavLink } from 'react-router-dom';

/* Lightweight inline SVG icons for a professional look */
const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  monitoring: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  alerts: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  maintenance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

const NAV = [
  { to: '/',            icon: icons.dashboard,   label: 'Dashboard',   end: true },
  { to: '/monitoring',  icon: icons.monitoring,  label: 'Monitoring',  end: false },
  { to: '/alerts',      icon: icons.alerts,      label: 'Alerts',      end: false },
  { to: '/maintenance', icon: icons.maintenance, label: 'Maintenance', end: false },
  { to: '/reports',     icon: icons.reports,     label: 'Reports',     end: false },
  { to: '/settings',    icon: icons.settings,    label: 'Settings',    end: false },
];

const Sidebar: React.FC = () => (
  <nav style={{
    width: 240,
    background: 'var(--color-sidebar)',
    minHeight: '100vh',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    transition: 'background 0.2s',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  }}>
    {/* Logo area */}
    <div style={{
      padding: '1.5rem 1.25rem',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 2px 8px rgba(26,86,219,0.3)',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.02em' }}>
            PredictiveMX
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginTop: 1 }}>
            Maintenance Platform
          </div>
        </div>
      </div>
    </div>

    {/* Nav items */}
    <div style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase',
        letterSpacing: '0.08em', padding: '0 0.75rem', marginBottom: 8,
      }}>
        Menu
      </div>
      {NAV.map(({ to, icon, label, end }) => (
        <NavLink key={to} to={to} end={end}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0.55rem 0.75rem',
            color: isActive ? '#e5e7eb' : '#9ca3af',
            background: isActive ? 'var(--color-sidebar-active)' : 'transparent',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: isActive ? 600 : 500,
            borderRadius: 8,
            borderLeft: isActive ? '2px solid var(--color-primary, #1a56db)' : '2px solid transparent',
            transition: 'all 0.15s ease',
            letterSpacing: '-0.01em',
          })}
          onMouseOver={(e) => {
            const el = e.currentTarget;
            if (!el.getAttribute('class')?.includes('active')) {
              el.style.background = 'var(--color-sidebar-hover)';
              el.style.color = '#d1d5db';
            }
          }}
          onMouseOut={(e) => {
            const el = e.currentTarget;
            if (!el.getAttribute('class')?.includes('active')) {
              el.style.background = 'transparent';
              el.style.color = '#9ca3af';
            }
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', width: 20, justifyContent: 'center' }}>{icon}</span>
          {label}
        </NavLink>
      ))}
    </div>

    {/* Bottom section */}
    <div style={{
      padding: '1rem 1.25rem',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        padding: '0.65rem 0.75rem',
        borderRadius: 8,
        background: 'rgba(26, 86, 219, 0.08)',
        border: '1px solid rgba(26, 86, 219, 0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#34d399',
            boxShadow: '0 0 6px rgba(52, 211, 153, 0.5)',
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#93c5fd' }}>
            System Active
          </span>
        </div>
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
          AI models running · Auto-dispatch enabled
        </div>
      </div>
    </div>
  </nav>
);

export default Sidebar;
