import React from 'react';
import type { Machine } from '../../types/machine.types';

interface Props {
  machines: Machine[];
}

interface Segment {
  label: string;
  count: number;
  color: string;
}

const PIE_SIZE = 160;
const CENTER = PIE_SIZE / 2;
const RADIUS = 60;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  // Full circle edge case
  if (endAngle - startAngle >= 359.999) {
    return [
      `M ${cx} ${cy - r}`,
      `A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r}`,
      'Z',
    ].join(' ');
  }
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

const SystemOverviewPie: React.FC<Props> = ({ machines }) => {
  const total = machines.length;

  const segments: Segment[] = [
    { label: 'Healthy', count: machines.filter(m => m.status === 'online' && m.riskLevel === 'low').length, color: '#22c55e' },
    { label: 'Warning', count: machines.filter(m => m.status === 'warning' || m.riskLevel === 'medium' || m.riskLevel === 'high').length, color: '#f59e0b' },
    { label: 'Critical', count: machines.filter(m => m.status === 'critical' || m.riskLevel === 'critical').length, color: '#ef4444' },
    { label: 'Offline', count: machines.filter(m => m.status === 'offline' || m.status === 'maintenance').length, color: '#94a3b8' },
  ].filter(s => s.count > 0);

  if (total === 0) {
    return (
      <div style={{ background: 'var(--color-surface, #fff)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border, #e2e8f0)' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 8 }}>System Overview</h3>
        <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>No machines</p>
      </div>
    );
  }

  // Build pie arcs
  let cumAngle = 0;
  const arcs = segments.map((s) => {
    const angle = (s.count / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    return { ...s, startAngle, endAngle: cumAngle };
  });

  return (
    <div style={{
      background: 'var(--color-surface, #fff)', borderRadius: 12, padding: '1.25rem',
      border: '1px solid var(--color-border, #e2e8f0)',
    }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 12, color: 'var(--color-text)' }}>
        System Overview
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <svg width={PIE_SIZE} height={PIE_SIZE} viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`}>
          {arcs.map((a, i) => (
            <path
              key={i}
              d={describeArc(CENTER, CENTER, RADIUS, a.startAngle, a.endAngle)}
              fill={a.color}
              stroke="var(--color-surface, #fff)"
              strokeWidth={2}
            />
          ))}
          {/* Center label */}
          <text x={CENTER} y={CENTER - 6} textAnchor="middle" fontSize={22} fontWeight={800} fill="var(--color-text, #0f172a)">
            {total}
          </text>
          <text x={CENTER} y={CENTER + 12} textAnchor="middle" fontSize={10} fill="var(--color-muted)">
            machines
          </text>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {segments.map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--color-muted, #64748b)' }}>{s.label}</span>
              <span style={{ fontWeight: 700, color: 'var(--color-text)', marginLeft: 'auto' }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemOverviewPie;
