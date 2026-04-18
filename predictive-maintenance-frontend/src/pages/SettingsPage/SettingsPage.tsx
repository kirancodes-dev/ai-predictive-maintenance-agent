import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/api/apiClient';
import SystemSettings from '../../components/settings/SystemSettings';
import toast from 'react-hot-toast';

interface SensorThreshold {
  id: string;
  sensorType: string;
  name: string;
  unit: string;
  minThreshold: number;
  maxThreshold: number;
  criticalMin: number;
  criticalMax: number;
}

interface MachineOption { id: string; name: string; }

const MACHINES: MachineOption[] = [
  { id: 'CNC_01', name: 'CNC Mill 01' },
  { id: 'CNC_02', name: 'CNC Lathe 02' },
  { id: 'PUMP_03', name: 'Industrial Pump 03' },
  { id: 'CONVEYOR_04', name: 'Conveyor Belt 04' },
];

/* ── Profile Editor Sub-component ── */
const ProfileEditor: React.FC<{
  user: any;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}> = ({ user, inputStyle, labelStyle }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await apiClient.put('/auth/me', { name: form.name, email: form.email });
      toast.success('Profile updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await apiClient.put('/auth/password', { oldPassword, newPassword });
      toast.success('Password changed');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Profile Info Card */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 8, padding: '1.5rem', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>👤 User Profile</h3>
          <button
            onClick={() => setEditing(!editing)}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
              border: `1px solid ${editing ? 'var(--color-danger, #dc2626)' : 'var(--color-primary, #1a56db)'}`,
              background: 'transparent',
              color: editing ? 'var(--color-danger, #dc2626)' : 'var(--color-primary, #1a56db)',
            }}
          >
            {editing ? 'Cancel' : '✏️ Edit Profile'}
          </button>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary, #1a56db), #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 20, fontWeight: 700,
          }}>
            {(user?.name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{user?.role || 'Operator'} · ID: {user?.id?.slice(0, 8)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              style={{ ...inputStyle, ...(editing ? {} : { opacity: 0.7 }) }}
              value={editing ? form.name : (user?.name || '')}
              readOnly={!editing}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              style={{ ...inputStyle, ...(editing ? {} : { opacity: 0.7 }) }}
              value={editing ? form.email : (user?.email || '')}
              readOnly={!editing}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <input style={{ ...inputStyle, opacity: 0.7 }} value={user?.role || ''} readOnly />
          </div>
          <div>
            <label style={labelStyle}>Member Since</label>
            <input style={{ ...inputStyle, opacity: 0.7 }} value={new Date().toLocaleDateString()} readOnly />
          </div>
        </div>

        {editing && (
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            style={{
              marginTop: '1rem', padding: '8px 24px', fontSize: 13, fontWeight: 600,
              border: 'none', borderRadius: 6, cursor: 'pointer',
              background: 'var(--color-primary, #1a56db)', color: '#fff',
            }}
          >
            {savingProfile ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Change Password Card */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 8, padding: '1.5rem', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>🔐 Change Password</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <input type="password" style={inputStyle} value={oldPassword}
              onChange={e => setOldPassword(e.target.value)} placeholder="••••••" />
          </div>
          <div>
            <label style={labelStyle}>New Password</label>
            <input type="password" style={inputStyle} value={newPassword}
              onChange={e => setNewPassword(e.target.value)} placeholder="••••••" />
          </div>
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input type="password" style={inputStyle} value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••" />
          </div>
        </div>
        <button
          onClick={handleChangePassword}
          disabled={savingPassword || !oldPassword || !newPassword}
          style={{
            marginTop: '1rem', padding: '8px 24px', fontSize: 13, fontWeight: 600,
            border: 'none', borderRadius: 6, cursor: savingPassword ? 'not-allowed' : 'pointer',
            background: !oldPassword || !newPassword ? 'var(--color-muted)' : '#f97316', color: '#fff',
          }}
        >
          {savingPassword ? 'Changing…' : 'Change Password'}
        </button>
      </div>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'alerts' | 'system'>('profile');

  // Per-machine threshold state
  const [selectedMachine, setSelectedMachine] = useState(MACHINES[0].id);
  const [thresholds, setThresholds] = useState<SensorThreshold[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchThresholds = useCallback(async (machineId: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/machines/${machineId}/thresholds`);
      setThresholds(res.data.data ?? []);
    } catch {
      toast.error('Failed to load thresholds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'alerts') fetchThresholds(selectedMachine);
  }, [activeTab, selectedMachine, fetchThresholds]);

  const handleThresholdChange = (idx: number, field: keyof SensorThreshold, value: number) => {
    setThresholds(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const handleSaveThresholds = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/machines/${selectedMachine}/thresholds`, thresholds.map(t => ({
        sensorType: t.sensorType,
        minThreshold: t.minThreshold,
        maxThreshold: t.maxThreshold,
        criticalMin: t.criticalMin,
        criticalMax: t.criticalMax,
      })));
      toast.success('Thresholds saved');
    } catch {
      toast.error('Failed to save thresholds');
    } finally {
      setSaving(false);
    }
  };

  const tabStyle = (active: boolean) => ({
    padding: '0.5rem 1.25rem',
    border: 'none',
    borderBottom: active ? '2px solid var(--color-primary, #1a56db)' : '2px solid transparent',
    background: 'transparent',
    color: active ? 'var(--color-primary, #1a56db)' : 'var(--color-muted)',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer' as const,
    fontSize: '0.875rem',
  });

  const inputStyle = {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--color-input-border)',
    borderRadius: 6,
    fontSize: '0.875rem',
    width: '100%',
    background: 'var(--color-input-bg)',
    color: 'var(--color-text)',
  };

  const labelStyle = { fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: 4, display: 'block' as const };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Settings</h1>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-muted, #64748b)', marginBottom: '1rem' }}>Manage your profile, alert thresholds, and system preferences</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
        <button style={tabStyle(activeTab === 'profile')} onClick={() => setActiveTab('profile')}>Profile</button>
        <button style={tabStyle(activeTab === 'alerts')} onClick={() => setActiveTab('alerts')}>Alert Thresholds</button>
        <button style={tabStyle(activeTab === 'system')} onClick={() => setActiveTab('system')}>System</button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <ProfileEditor user={user} inputStyle={inputStyle} labelStyle={labelStyle} />
      )}

      {/* Alerts Tab — Per-Machine Thresholds */}
      {activeTab === 'alerts' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 8, padding: '1.5rem', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Per-Machine Alert Thresholds</h3>

          {/* Machine selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Select Machine</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={selectedMachine}
              onChange={e => setSelectedMachine(e.target.value)}
            >
              {MACHINES.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>Loading thresholds...</p>
          ) : thresholds.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>No sensors configured for this machine.</p>
          ) : (
            <>
              {thresholds.map((t, idx) => (
                <div key={t.id} style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--color-surface-alt)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 8 }}>
                    {t.name} <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>({t.unit})</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={labelStyle}>Warning Min</label>
                      <input type="number" step="0.1" style={inputStyle} value={t.minThreshold}
                        onChange={e => handleThresholdChange(idx, 'minThreshold', +e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Warning Max</label>
                      <input type="number" step="0.1" style={inputStyle} value={t.maxThreshold}
                        onChange={e => handleThresholdChange(idx, 'maxThreshold', +e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Critical Min</label>
                      <input type="number" step="0.1" style={inputStyle} value={t.criticalMin}
                        onChange={e => handleThresholdChange(idx, 'criticalMin', +e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Critical Max</label>
                      <input type="number" step="0.1" style={inputStyle} value={t.criticalMax}
                        onChange={e => handleThresholdChange(idx, 'criticalMax', +e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          <button
            onClick={handleSaveThresholds}
            disabled={saving || loading || thresholds.length === 0}
            style={{
              marginTop: '0.5rem', padding: '0.5rem 1.5rem',
              background: saving ? 'var(--color-muted)' : 'var(--color-primary)', color: '#fff', border: 'none',
              borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600,
            }}
          >
            {saving ? 'Saving...' : 'Save Thresholds'}
          </button>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 8, padding: '1.5rem', border: '1px solid var(--color-border)' }}>
          <SystemSettings />
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
