import React from 'react';
import { useLocation } from 'react-router-dom';
import './Header.css';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import NotificationBell from '../NotificationBell';

const Header: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/machines/')) return 'Machine Details';
    return path.slice(1).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="header">
      <div className="header__title">{getPageTitle()}</div>
      <div className="header__actions">
        {user && (
          <span className="header__greeting">
            {getGreeting()}, {user.name?.split(' ')[0]}
          </span>
        )}
        <button
          className="header__theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <NotificationBell />
        {user && (
          <div className="header__user">
            <div className="header__avatar">{getInitials(user.name)}</div>
            <div className="header__user-info">
              <span className="header__user-name">{user.name}</span>
              <span className="header__user-role">{user.role || 'Operator'}</span>
            </div>
            <button className="header__logout" onClick={logout}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
