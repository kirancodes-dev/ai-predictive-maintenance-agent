import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@factory.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthContext();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: '#f0f2f5',
      }}
    >
      {/* Left panel — branding */}
      <div style={{
        flex: '0 0 480px',
        background: 'linear-gradient(160deg, #0b1120 0%, #111827 40%, #1a2744 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '4rem 3.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '60%', width: 300, height: 300,
          borderRadius: '50%', background: 'rgba(26,86,219,0.08)',
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '2.5rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(26,86,219,0.25)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.02em' }}>
                PredictiveMX
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                Maintenance Platform
              </div>
            </div>
          </div>

          <h2 style={{
            fontSize: '1.75rem', fontWeight: 700, color: '#e5e7eb',
            lineHeight: 1.3, margin: '0 0 1rem', letterSpacing: '-0.02em',
          }}>
            AI-Powered Predictive<br />Maintenance
          </h2>
          <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, margin: 0, maxWidth: 340 }}>
            Monitor equipment health, predict failures before they happen, and optimize maintenance schedules with machine learning.
          </p>

          <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '✓', text: 'Real-time sensor monitoring' },
              { icon: '✓', text: 'ML-powered failure prediction' },
              { icon: '✓', text: 'Automated technician dispatch' },
            ].map((f) => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 16 }}>{f.icon}</span>
                <span style={{ fontSize: 13, color: '#d1d5db', fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: 400,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          <div style={{ marginBottom: '0.5rem' }}>
            <h1 style={{
              fontSize: '1.5rem', fontWeight: 700, color: '#1a1d21',
              margin: '0 0 6px', letterSpacing: '-0.02em',
            }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              Sign in to your account to continue
            </p>
          </div>

          <div>
            <label style={{
              fontSize: 13, fontWeight: 600, color: '#44495a', display: 'block', marginBottom: 6,
            }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.875rem',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#1a1d21',
                fontSize: 14,
                boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#1a56db';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,86,219,0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label style={{
              fontSize: 13, fontWeight: 600, color: '#44495a', display: 'block', marginBottom: 6,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.875rem',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#1a1d21',
                fontSize: 14,
                boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#1a56db';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,86,219,0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.7rem',
              borderRadius: 8,
              border: 'none',
              background: loading ? '#9ca3af' : '#1a56db',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              boxShadow: loading ? 'none' : '0 1px 3px rgba(26,86,219,0.2)',
              letterSpacing: '0.01em',
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = '#1e40af'; }}
            onMouseOut={(e) => { if (!loading) e.currentTarget.style.background = '#1a56db'; }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 8,
            background: '#f8f9fb',
            border: '1px solid #e5e7eb',
            fontSize: 12,
            color: '#6b7280',
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: '#44495a' }}>Demo Credentials</div>
            <div>Email: admin@factory.com</div>
            <div>Password: Admin@123</div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
