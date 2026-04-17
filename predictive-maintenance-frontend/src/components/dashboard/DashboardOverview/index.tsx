import React from 'react';

interface Stat {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
  trend?: string;
}

const DashboardOverview: React.FC<{ stats: Stat[] }> = ({ stats }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
    {stats.map((s) => (
      <div key={s.label} style={{
        background: 'var(--color-surface, #fff)',
        border: '1px solid var(--color-border, #e2e8f0)',
        borderRadius: 14,
        padding: '1.25rem 1.25rem 1rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 3px var(--color-card-shadow, rgba(0,0,0,0.04))',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'default',
      }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px var(--color-card-shadow, rgba(0,0,0,0.08))';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px var(--color-card-shadow, rgba(0,0,0,0.04))';
        }}
      >
        {/* Background icon */}
        <div style={{
          position: 'absolute', top: 10, right: 12, fontSize: '2rem', opacity: 0.08,
          pointerEvents: 'none',
        }}>
          {s.icon}
        </div>
        {/* Color accent top strip */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: s.color ? `linear-gradient(90deg, ${s.color}, ${s.color}80)` : 'transparent',
          borderRadius: '14px 14px 0 0',
        }} />
        <div style={{
          fontSize: 11, color: 'var(--color-muted, #64748b)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
        }}>
          {s.label}
        </div>
        <div style={{
          fontSize: '2rem', fontWeight: 800, color: s.color ?? 'var(--color-text, #0f172a)',
          lineHeight: 1, fontFamily: 'monospace',
        }}>
          {s.value}
        </div>
        {s.trend && (
          <div style={{ fontSize: '0.7rem', color: 'var(--color-subtle, #94a3b8)', marginTop: 6 }}>{s.trend}</div>
        )}
      </div>
    ))}
  </div>
);

export default DashboardOverview;
