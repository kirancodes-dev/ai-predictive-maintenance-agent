import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '5rem', lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Page Not Found</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        style={{
          marginTop: '0.5rem',
          padding: '0.625rem 1.5rem',
          background: 'var(--color-primary)',
          color: '#fff',
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Go to Dashboard
      </Link>
    </div>
  );
};

export default NotFoundPage;
