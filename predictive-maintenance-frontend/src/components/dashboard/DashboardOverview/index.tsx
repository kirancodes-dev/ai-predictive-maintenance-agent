import React from 'react';

interface Stat {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
  trend?: string;
}

const DashboardOverview: React.FC<{ stats: Stat[] }> = ({ stats }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
    {stats.map((s) => (
      <div key={s.label} style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
        padding: '1.25rem 1.25rem 1rem', position: 'relative', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          position: 'absolute', top: 12, right: 12, fontSize: '1.6rem', opacity: 0.15,
        }}>
          {s.icon}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: 6 }}>
          {s.label}
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color ?? '#0f172a', lineHeight: 1 }}>
          {s.value}
        </div>
        {s.trend && (
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>{s.trend}</div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                      background: s.color ? `${s.color}40` : 'transparent', borderRadius: '0 0 12px 12px' }} />
      </div>
    ))}
  </div>
);

export default DashboardOverview;
