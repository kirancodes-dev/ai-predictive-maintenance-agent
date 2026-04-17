import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => (
  <div style={{ textAlign: 'center', padding: '6rem 2rem', maxWidth: 480, margin: '0 auto' }}>
    <div style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--color-primary, #1a56db)', letterSpacing: '-0.04em', lineHeight: 1 }}>404</div>
    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '1rem 0 0.5rem', color: 'var(--color-text)' }}>Page not found</h2>
    <p style={{ color: 'var(--color-muted, #64748b)', fontSize: 14, margin: '0 0 1.5rem' }}>The page you're looking for doesn't exist or has been moved.</p>
    <Link to="/" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      color: '#fff', background: 'var(--color-primary, #1a56db)',
      padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
      fontSize: 14, fontWeight: 600, transition: 'opacity 0.15s',
    }}>← Back to Dashboard</Link>
  </div>
);

export default NotFoundPage;
