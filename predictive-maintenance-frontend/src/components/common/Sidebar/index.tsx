import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/',            label: '🏠 Dashboard',    end: true },
  { to: '/monitoring',  label: '📡 Monitoring',   end: false },
  { to: '/alerts',      label: '🚨 Alerts',       end: false },
  { to: '/maintenance', label: '🔧 Maintenance',  end: false },
  { to: '/reports',     label: '📊 Reports',      end: false },
  { to: '/settings',    label: '⚙️ Settings',     end: false },
];

const Sidebar: React.FC = () => (
  <nav style={{
    width: '210px', background: '#0f172a', minHeight: '100vh',
    padding: '1rem 0', flexShrink: 0,
  }}>
    {NAV.map(({ to, label, end }) => (
      <NavLink key={to} to={to} end={end}
        style={({ isActive }) => ({
          display: 'block', padding: '0.625rem 1.25rem',
          color: isActive ? '#fff' : '#94a3b8',
          background: isActive ? '#1e3a5f' : 'transparent',
          textDecoration: 'none', fontSize: '0.875rem',
          fontWeight: isActive ? 600 : 400,
          borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
          transition: 'all 0.15s ease',
        })}>
        {label}
      </NavLink>
    ))}
  </nav>
);

export default Sidebar;
