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
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background decoration */}
      <div style={{
        position: 'absolute', top: -120, right: -120, width: 320, height: 320,
        borderRadius: '50%', background: 'rgba(59,130,246,0.06)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -100, left: -100, width: 280, height: 280,
        borderRadius: '50%', background: 'rgba(139,92,246,0.05)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      <form
        onSubmit={handleSubmit}
        style={{
          background: 'rgba(30, 41, 59, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '2.5rem',
          borderRadius: '20px',
          width: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          color: '#f1f5f9',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 12px',
            boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
          }}>
            ⚙️
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            PredictiveMX
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: 0 }}>
            AI-Powered Maintenance Platform
          </p>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.7rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid rgba(51, 65, 85, 0.8)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#f1f5f9',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.8)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.7rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid rgba(51, 65, 85, 0.8)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#f1f5f9',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.8)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.8rem',
            borderRadius: '10px',
            border: 'none',
            background: loading ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.9375rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '0.25rem',
            transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(59,130,246,0.3)',
          }}
          onMouseOver={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>

        <p style={{ fontSize: '0.7rem', color: '#475569', textAlign: 'center', margin: 0 }}>
          Demo: admin@factory.com / Admin@123
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
