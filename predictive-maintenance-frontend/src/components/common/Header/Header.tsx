import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './Header.css';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import NotificationBell from '../NotificationBell';
import { useQuery } from 'react-query';
import { insightsApi } from '../../../services/api/insightsApi';

/* ── Animated counter hook ─────────────────────────────────────────────── */
function useAnimatedCounter(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (target === 0) return;
    fromRef.current = value;
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

const Header: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  /* ── Live Cost Saved Counter ───────────────────────────────────────── */
  const { data: overviewData } = useQuery(
    'insights-overview-header',
    () => insightsApi.getOverview().then(r => r.data?.data ?? []),
    { refetchInterval: 15_000, staleTime: 10_000, retry: 1 },
  );
  const totalSaved = (overviewData ?? []).reduce((sum: number, m: any) => {
    const roi = m?.roi;
    if (!roi) return sum;
    return sum + (roi.downtime_cost_saved ?? 0) + (roi.repair_cost_saved ?? 0);
  }, 0);
  const animatedSaved = useAnimatedCounter(totalSaved, 1800);

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
      {totalSaved > 0 && (
        <div className="header__cost-saved">
          <span className="header__cost-saved-icon">💰</span>
          <div className="header__cost-saved-text">
            <span className="header__cost-saved-label">AI Savings</span>
            <span className="header__cost-saved-value">${animatedSaved.toLocaleString()}</span>
          </div>
        </div>
      )}
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
