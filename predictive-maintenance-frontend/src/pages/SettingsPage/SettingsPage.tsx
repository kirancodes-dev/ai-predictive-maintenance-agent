import React from 'react';
import UserProfile from '../../components/settings/UserProfile';
import AlertConfig from '../../components/settings/AlertConfig';
import MachineConfig from '../../components/settings/MachineConfig';
import SystemSettings from '../../components/settings/SystemSettings';

const card: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.5rem',
};

const SettingsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 700 }}>
      <div style={card}><UserProfile /></div>
      <div style={card}><SystemSettings /></div>
      <div style={card}><AlertConfig /></div>
      <div style={card}><MachineConfig /></div>
    </div>
  );
};

export default SettingsPage;
