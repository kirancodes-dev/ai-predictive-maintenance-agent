import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './CommandPalette.css';

interface CommandItem {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  category: string;
  keywords?: string;
}

const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands: CommandItem[] = useMemo(() => [
    { id: 'dashboard', label: 'Go to Dashboard', icon: '📊', action: () => navigate('/'), category: 'Navigate', keywords: 'home overview' },
    { id: 'agent', label: 'Go to AI Agent', icon: '🤖', action: () => navigate('/agent'), category: 'Navigate', keywords: 'ipma command center' },
    { id: 'live', label: 'Go to Live Monitor', icon: '📡', action: () => navigate('/live'), category: 'Navigate', keywords: 'stream sensors real-time' },
    { id: 'history', label: 'Go to History', icon: '📈', action: () => navigate('/history'), category: 'Navigate', keywords: 'past data chart' },
    { id: 'maintenance', label: 'Go to Maintenance', icon: '🔧', action: () => navigate('/maintenance'), category: 'Navigate', keywords: 'work orders schedule' },
    { id: 'alerts', label: 'Go to Alerts', icon: '🚨', action: () => navigate('/alerts'), category: 'Navigate', keywords: 'warnings critical errors' },
    { id: 'reports', label: 'Go to Reports', icon: '📄', action: () => navigate('/reports'), category: 'Navigate', keywords: 'analytics export' },
    { id: 'settings', label: 'Go to Settings', icon: '⚙️', action: () => navigate('/settings'), category: 'Navigate', keywords: 'profile preferences theme' },
    { id: 'cnc01', label: 'CNC Mill 01', icon: '🏭', action: () => navigate('/machines/CNC_01'), category: 'Machines', keywords: 'cnc mill bearing' },
    { id: 'cnc02', label: 'CNC Lathe 02', icon: '🏭', action: () => navigate('/machines/CNC_02'), category: 'Machines', keywords: 'cnc lathe thermal' },
    { id: 'pump03', label: 'Industrial Pump 03', icon: '🏭', action: () => navigate('/machines/PUMP_03'), category: 'Machines', keywords: 'pump cavitation' },
    { id: 'conv04', label: 'Conveyor Belt 04', icon: '🏭', action: () => navigate('/machines/CONVEYOR_04'), category: 'Machines', keywords: 'conveyor belt healthy' },
    { id: 'theme', label: 'Toggle Dark/Light Theme', icon: '🎨', action: () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    }, category: 'Actions', keywords: 'dark light mode color' },
  ], [navigate]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.keywords && c.keywords.toLowerCase().includes(q))
    );
  }, [query, commands]);

  useEffect(() => setSelected(0), [filtered]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && filtered[selected]) {
      filtered[selected].action();
      setOpen(false);
    }
  };

  if (!open) return null;

  // Group by category
  const groups: Record<string, CommandItem[]> = {};
  filtered.forEach(c => {
    if (!groups[c.category]) groups[c.category] = [];
    groups[c.category].push(c);
  });

  let flatIdx = 0;

  return (
    <div className="cmd-palette__overlay" onClick={() => setOpen(false)}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <div className="cmd-palette__search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="cmd-palette__input"
            placeholder="Search pages, machines, actions…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="cmd-palette__kbd">ESC</kbd>
        </div>
        <div className="cmd-palette__results">
          {filtered.length === 0 ? (
            <div className="cmd-palette__empty">No results found</div>
          ) : (
            Object.entries(groups).map(([category, items]) => (
              <div key={category}>
                <div className="cmd-palette__group">{category}</div>
                {items.map(item => {
                  const idx = flatIdx++;
                  return (
                    <button
                      key={item.id}
                      className={`cmd-palette__item${idx === selected ? ' cmd-palette__item--selected' : ''}`}
                      onClick={() => { item.action(); setOpen(false); }}
                      onMouseEnter={() => setSelected(idx)}
                    >
                      <span className="cmd-palette__item-icon">{item.icon}</span>
                      <span className="cmd-palette__item-label">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="cmd-palette__hint">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
