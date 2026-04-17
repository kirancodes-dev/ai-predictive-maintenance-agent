import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'alerts' | 'system'>('profile');

  // Alert threshold state (local only — no backend persistence yet)
  const [thresholds, setThresholds] = useState({
    temperatureWarning: 85,
    temperatureCritical: 95,
    vibrationWarning: 4.0,
    vibrationCritical: 5.5,
    riskScoreAlert: 60,
  });

  const [saved, setSaved] = useState(false);

  const handleSaveThresholds = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabStyle = (active: boolean) => ({
    padding: '0.5rem 1.25rem',
    border: 'none',
    borderBottom: active ? '2px solid var(--color-primary, #1a56db)' : '2px solid transparent',
    background: 'transparent',
    color: active ? 'var(--color-primary, #1a56db)' : '#64748b',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer' as const,
    fontSize: '0.875rem',
  });

  const inputStyle = {
    padding: '0.5rem 0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: '0.875rem',
    width: '100%',
  };

  const labelStyle = { fontSize: '0.875rem', color: '#64748b', marginBottom: 4, display: 'block' as const };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Settings</h1>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-muted, #64748b)', marginBottom: '1rem' }}>Manage your profile, alert thresholds, and system preferences</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button style={tabStyle(activeTab === 'profile')} onClick={() => setActiveTab('profile')}>Profile</button>
        <button style={tabStyle(activeTab === 'alerts')} onClick={() => setActiveTab('alerts')}>Alert Thresholds</button>
        <button style={tabStyle(activeTab === 'system')} onClick={() => setActiveTab('system')}>System</button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>👤 User Profile</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={user?.name || ''} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} value={user?.email || ''} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <input style={inputStyle} value={user?.role || ''} readOnly />
            </div>
            <div>
              <label style={labelStyle}>User ID</label>
              <input style={inputStyle} value={user?.id || ''} readOnly />
            </div>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '1rem' }}>
            Profile editing will be available in a future update.
          </p>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Alert Thresholds</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Temperature Warning (°C)</label>
              <input
                type="number" style={inputStyle}
                value={thresholds.temperatureWarning}
                onChange={e => setThresholds(t => ({ ...t, temperatureWarning: +e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Temperature Critical (°C)</label>
              <input
                type="number" style={inputStyle}
                value={thresholds.temperatureCritical}
                onChange={e => setThresholds(t => ({ ...t, temperatureCritical: +e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Vibration Warning (mm/s)</label>
              <input
                type="number" step="0.1" style={inputStyle}
                value={thresholds.vibrationWarning}
                onChange={e => setThresholds(t => ({ ...t, vibrationWarning: +e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Vibration Critical (mm/s)</label>
              <input
                type="number" step="0.1" style={inputStyle}
                value={thresholds.vibrationCritical}
                onChange={e => setThresholds(t => ({ ...t, vibrationCritical: +e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Risk Score Alert Threshold (%)</label>
              <input
                type="number" style={inputStyle}
                value={thresholds.riskScoreAlert}
                onChange={e => setThresholds(t => ({ ...t, riskScoreAlert: +e.target.value }))}
              />
            </div>
          </div>
          <button
            onClick={handleSaveThresholds}
            style={{
              marginTop: '1rem', padding: '0.5rem 1.5rem',
              background: '#3b82f6', color: '#fff', border: 'none',
              borderRadius: 6, cursor: 'pointer', fontWeight: 600,
            }}
          >
            {saved ? '✓ Saved' : 'Save Thresholds'}
          </button>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>🖥️ System Information</h3>
          <div style={{ fontSize: '0.875rem', display: 'grid', gap: '0.5rem' }}>
            <div><span style={{ color: '#64748b' }}>API Server:</span> http://localhost:8000</div>
            <div><span style={{ color: '#64748b' }}>Simulation Server:</span> http://localhost:3000</div>
            <div><span style={{ color: '#64748b' }}>Frontend Version:</span> 1.0.0</div>
            <div><span style={{ color: '#64748b' }}>Backend Version:</span> 2.0.0</div>
            <div><span style={{ color: '#64748b' }}>Automation Loop:</span> Running (30s interval)</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
