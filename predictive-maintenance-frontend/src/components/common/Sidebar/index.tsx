import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/',            icon: '📊', label: 'Dashboard',   end: true },
  { to: '/monitoring',  icon: '📡', label: 'Monitoring',  end: false },
  { to: '/alerts',      icon: '🚨', label: 'Alerts',      end: false },
  { to: '/maintenance', icon: '🔧', label: 'Maintenance', end: false },
  { to: '/reports',     icon: '📈', label: 'Reports',     end: false },
  { to: '/settings',    icon: '⚙️', label: 'Settings',    end: false },
];

const Sidebar: React.FC = () => (
  <nav style={{
    width: 220,
    background: 'var(--color-sidebar, #0f172a)',
    minHeight: '100vh',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    transition: 'background 0.3s',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  }}>
    {/* Logo area */}
    <div style={{
      padding: '1.25rem 1.25rem 1.5rem',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          ⚙️
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
            PredictiveMX
          </div>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>
            AI Maintenance
          </div>
        </div>
      </div>
    </div>

    {/* Nav items */}
    <div style={{ padding: '0.75rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase',
        letterSpacing: '0.08em', padding: '0 0.5rem', marginBottom: 4,
      }}>
        Navigation
      </div>
      {NAV.map(({ to, icon, label, end }) => (
        <NavLink key={to} to={to} end={end}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0.6rem 0.75rem',
            color: isActive ? '#fff' : '#94a3b8',
            background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: isActive ? 600 : 500,
            borderRadius: 8,
            borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
            transition: 'all 0.15s ease',
          })}
          onMouseOver={(e) => {
            const el = e.currentTarget;
            if (!el.classList.contains('active')) {
              el.style.background = 'rgba(255,255,255,0.05)';
              el.style.color = '#e2e8f0';
            }
          }}
          onMouseOut={(e) => {
            const el = e.currentTarget;
            if (!el.classList.contains('active')) {
              el.style.background = 'transparent';
              el.style.color = '#94a3b8';
            }
          }}
        >
          <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{icon}</span>
          {label}
        </NavLink>
      ))}
    </div>

    {/* Bottom section */}
    <div style={{
      padding: '1rem 1.25rem',
      borderTop: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{
        padding: '0.6rem 0.75rem',
        borderRadius: 8,
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.15)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#60a5fa', marginBottom: 2 }}>
          🤖 AI Status
        </div>
        <div style={{ fontSize: 10, color: '#64748b' }}>
          Models active · Auto-dispatch on
        </div>
      </div>
    </div>
  </nav>
);

export default Sidebar;
