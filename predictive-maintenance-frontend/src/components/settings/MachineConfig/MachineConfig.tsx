import React, { useState } from 'react';

interface SensorLimit {
  type: string;
  label: string;
  warningMax: number;
  criticalMax: number;
  unit: string;
}

const defaultLimits: SensorLimit[] = [
  { type: 'temperature', label: 'Temperature', warningMax: 85, criticalMax: 95, unit: '°C' },
  { type: 'vibration', label: 'Vibration', warningMax: 3.5, criticalMax: 5.0, unit: 'mm/s' },
  { type: 'rpm', label: 'RPM (min)', warningMax: 1300, criticalMax: 1200, unit: 'RPM' },
  { type: 'current', label: 'Current', warningMax: 15, criticalMax: 18, unit: 'A' },
];

const MachineConfig: React.FC = () => {
  const [limits, setLimits] = useState<SensorLimit[]>(defaultLimits);
  const [saved, setSaved] = useState(false);

  const update = (type: string, field: 'warningMax' | 'criticalMax', val: string) =>
    setLimits(prev =>
      prev.map(l => (l.type === type ? { ...l, [field]: parseFloat(val) || 0 } : l))
    );

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Machine Sensor Limits</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Sensor Type', 'Warning Max', 'Critical Max', 'Unit'].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '0.5rem 0.75rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.8125rem',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {limits.map(limit => (
              <tr
                key={limit.type}
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <td style={{ padding: '0.625rem 0.75rem', fontWeight: 500 }}>{limit.label}</td>
                <td style={{ padding: '0.625rem 0.75rem' }}>
                  <input
                    type="number"
                    value={limit.warningMax}
                    onChange={e => update(limit.type, 'warningMax', e.target.value)}
                    style={{
                      width: 80,
                      padding: '0.3rem 0.5rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                      background: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </td>
                <td style={{ padding: '0.625rem 0.75rem' }}>
                  <input
                    type="number"
                    value={limit.criticalMax}
                    onChange={e => update(limit.type, 'criticalMax', e.target.value)}
                    style={{
                      width: 80,
                      padding: '0.3rem 0.5rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                      background: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </td>
                <td style={{ padding: '0.625rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                  {limit.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
        {saved ? '✓ Saved' : 'Save Limits'}
      </button>
    </div>
  );
};

export default MachineConfig;
