import React, { useState, useEffect } from 'react';
import './KeyboardShortcuts.css';

const shortcuts = [
  { keys: ['⌘', 'K'], desc: 'Open Command Palette' },
  { keys: ['⌘', 'B'], desc: 'Toggle Sidebar' },
  { keys: ['?'], desc: 'Show Keyboard Shortcuts' },
  { keys: ['G', 'D'], desc: 'Go to Dashboard' },
  { keys: ['G', 'A'], desc: 'Go to Alerts' },
  { keys: ['G', 'M'], desc: 'Go to Maintenance' },
  { keys: ['G', 'R'], desc: 'Go to Reports' },
  { keys: ['G', 'S'], desc: 'Go to Settings' },
  { keys: ['G', 'L'], desc: 'Go to Live Monitor' },
  { keys: ['Esc'], desc: 'Close modal / palette' },
];

const KeyboardShortcuts: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey &&
          !(e.target instanceof HTMLInputElement) &&
          !(e.target instanceof HTMLTextAreaElement) &&
          !(e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!open) return null;

  return (
    <div className="kbd-modal__overlay" onClick={() => setOpen(false)}>
      <div className="kbd-modal" onClick={e => e.stopPropagation()}>
        <div className="kbd-modal__header">
          <h2 className="kbd-modal__title">⌨️ Keyboard Shortcuts</h2>
          <button className="kbd-modal__close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="kbd-modal__list">
          {shortcuts.map((s, i) => (
            <div key={i} className="kbd-modal__row">
              <div className="kbd-modal__keys">
                {s.keys.map((k, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="kbd-modal__plus">+</span>}
                    <kbd className="kbd-modal__key">{k}</kbd>
                  </React.Fragment>
                ))}
              </div>
              <span className="kbd-modal__desc">{s.desc}</span>
            </div>
          ))}
        </div>
        <div className="kbd-modal__footer">
          Press <kbd>?</kbd> to toggle this dialog
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
