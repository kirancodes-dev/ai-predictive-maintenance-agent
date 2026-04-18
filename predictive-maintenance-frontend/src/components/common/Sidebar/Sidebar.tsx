import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/agent', label: 'AI Agent', icon: '🤖' },
  { to: '/insights', label: 'AI Insights', icon: '🧠' },
  { to: '/floor-map', label: 'Floor Map', icon: '🏭' },
  { to: '/live', label: 'Live Monitor', icon: '📡' },
  { to: '/history', label: 'History', icon: '📈' },
  { to: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { to: '/alerts', label: 'Alerts', icon: '🚨' },
  { to: '/reports', label: 'Reports', icon: '📄' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

const Sidebar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="sidebar__hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <span className={`sidebar__hamburger-line${mobileOpen ? ' sidebar__hamburger-line--open' : ''}`} />
        <span className={`sidebar__hamburger-line${mobileOpen ? ' sidebar__hamburger-line--open' : ''}`} />
        <span className={`sidebar__hamburger-line${mobileOpen ? ' sidebar__hamburger-line--open' : ''}`} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar__overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">⚙️</span>
          <span className="sidebar__logo-text">PredictiveAI</span>
        </div>
        <nav className="sidebar__nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
              }
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              <span className="sidebar__nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <kbd className="sidebar__shortcut">⌘K</kbd>
          <span className="sidebar__shortcut-label">Quick Search</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
