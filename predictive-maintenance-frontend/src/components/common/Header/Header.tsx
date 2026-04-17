import React from 'react';
import { useLocation } from 'react-router-dom';
import './Header.css';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';

const Header: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    return path.slice(1).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <header className="header">
      <div className="header__title">{getPageTitle()}</div>
      <div className="header__actions">
        <button
          className="header__theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        {user && (
          <div className="header__user">
            <span className="header__user-name">{user.name}</span>
            <button className="header__logout" onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
