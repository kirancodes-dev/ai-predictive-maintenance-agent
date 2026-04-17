import React, { useState } from 'react';

interface AlertRule {
  id: string;
  label: string;
  enabled: boolean;
  threshold: number;
  unit: string;
}

const defaultRules: AlertRule[] = [
  { id: 'temp_critical', label: 'Temperature Critical', enabled: true, threshold: 95, unit: '°C' },
  { id: 'temp_warning', label: 'Temperature Warning', enabled: true, threshold: 85, unit: '°C' },
  { id: 'vibration_critical', label: 'Vibration Critical', enabled: true, threshold: 5.0, unit: 'mm/s' },
  { id: 'vibration_warning', label: 'Vibration Warning', enabled: true, threshold: 3.5, unit: 'mm/s' },
  { id: 'rpm_drop', label: 'RPM Drop Alert', enabled: true, threshold: 1200, unit: 'RPM' },
  { id: 'current_overload', label: 'Current Overload', enabled: false, threshold: 18, unit: 'A' },
];

const AlertConfig: React.FC = () => {
  const [rules, setRules] = useState<AlertRule[]>(defaultRules);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) =>
    setRules(prev => prev.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r)));

  const changeThreshold = (id: string, val: string) =>
    setRules(prev =>
      prev.map(r => (r.id === id ? { ...r, threshold: parseFloat(val) || 0 } : r))
    );

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Alert Configuration</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rules.map(rule => (
          <div
            key={rule.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.75rem',
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={() => toggle(rule.id)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>{rule.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <input
                type="number"
                value={rule.threshold}
                onChange={e => changeThreshold(rule.id, e.target.value)}
                disabled={!rule.enabled}
                style={{
                  width: 72,
                  padding: '0.3rem 0.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  background: rule.enabled ? 'var(--color-background)' : 'var(--color-surface)',
                  color: rule.enabled ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', minWidth: 32 }}>
                {rule.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        style={{
          marginTop: '1rem',
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
        {saved ? '✓ Saved' : 'Save Rules'}
      </button>
    </div>
  );
};

export default AlertConfig;
