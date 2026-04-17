import React from 'react';

interface Stat {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
  trend?: string;
}

const DashboardOverview: React.FC<{ stats: Stat[] }> = ({ stats }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
    {stats.map((s) => (
      <div key={s.label} style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '1.25rem 1.5rem 1.125rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        cursor: 'default',
      }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontSize: 12, color: 'var(--color-muted)', fontWeight: 500,
              letterSpacing: '0.01em', marginBottom: 8,
            }}>
              {s.label}
            </div>
            <div style={{
              fontSize: '1.75rem', fontWeight: 700, color: s.color ?? 'var(--color-text)',
              lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            }}>
              {s.value}
            </div>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: s.color ? `${s.color}12` : 'var(--color-primary-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', flexShrink: 0,
          }}>
            {s.icon}
          </div>
        </div>
        {s.trend && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-subtle)', marginTop: 10 }}>{s.trend}</div>
        )}
        {/* Bottom accent line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: s.color ? `linear-gradient(90deg, ${s.color}, transparent)` : 'transparent',
          opacity: 0.5,
        }} />
      </div>
    ))}
  </div>
);

export default DashboardOverview;
