import React, { useState } from 'react';
import { useTheme } from '../../../hooks/useTheme';

const SystemSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [wsEnabled, setWsEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>System Settings</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <SettingRow label="Theme">
          <select
            value={theme}
            onChange={e => setTheme(e.target.value as 'light' | 'dark')}
            style={inputStyle}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </SettingRow>

        <SettingRow label="Data Refresh Interval (seconds)">
          <input
            type="number"
            min={5}
            max={300}
            value={refreshInterval}
            onChange={e => setRefreshInterval(Number(e.target.value))}
            style={{ ...inputStyle, width: 96 }}
          />
        </SettingRow>

        <SettingRow label="WebSocket Live Streaming">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={wsEnabled}
              onChange={e => setWsEnabled(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: '0.875rem' }}>{wsEnabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </SettingRow>

        <SettingRow label="API Base URL">
          <input
            value="http://localhost:8000/api/v1"
            readOnly
            style={{ ...inputStyle, color: 'var(--color-text-secondary)', cursor: 'not-allowed' }}
          />
        </SettingRow>
      </div>

      <button
        onClick={handleSave}
        style={{
          marginTop: '1.25rem',
          padding: '0.5rem 1.25rem',
          background: saved ? 'var(--color-success, #16a34a)' : 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  padding: '0.4375rem 0.75rem',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.875rem',
  background: 'var(--color-background)',
  color: 'var(--color-text-primary)',
};

const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem',
      background: 'var(--color-background)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
    }}
  >
    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</span>
    {children}
  </div>
);

export default SystemSettings;
