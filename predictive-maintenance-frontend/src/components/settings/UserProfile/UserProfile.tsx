import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>User Profile</h3>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            Full Name
          </label>
          <input
            defaultValue={user.name}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            Email
          </label>
          <input
            defaultValue={user.email}
            type="email"
            readOnly
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              background: 'var(--color-background)',
              color: 'var(--color-text-secondary)',
              cursor: 'not-allowed',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            Role
          </label>
          <input
            value={user.role}
            readOnly
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              background: 'var(--color-background)',
              color: 'var(--color-text-secondary)',
              cursor: 'not-allowed',
              textTransform: 'capitalize',
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            alignSelf: 'flex-start',
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
          {saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default UserProfile;
