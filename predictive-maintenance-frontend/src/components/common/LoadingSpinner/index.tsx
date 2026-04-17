import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizes = { sm: 16, md: 32, lg: 48 };

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', label = 'Loading...' }) => {
  const px = sizes[size];
  return (
    <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-primary)' }}
      >
        <circle cx="12" cy="12" r="10" stroke="var(--color-border)" />
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
      <span className="sr-only">{label}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default LoadingSpinner;
