import React from 'react';
import { useQuery } from 'react-query';
import { technicianApi } from '../../../services/api/predictionApi';
import type { Technician } from '../../../types/maintenance.types';

function shiftLabel(t: Technician): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(t.shiftStartHour)}:00 – ${pad(t.shiftEndHour)}:00 UTC`;
}

const TechnicianAvailability: React.FC = () => {
  const { data, isLoading } = useQuery(
    'technicians-all',
    () => technicianApi.getAll().then((r) => r.data.data),
    { refetchInterval: 30_000 }
  );

  const technicians: Technician[] = data ?? [];
  const onShiftAvail = technicians.filter((t) => t.isOnShift && t.isAvailable);
  const onShiftBusy  = technicians.filter((t) => t.isOnShift && !t.isAvailable);
  const offShift     = technicians.filter((t) => !t.isOnShift);

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          Technician Availability
        </h2>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.75rem',
            color: '#16a34a',
            background: '#f0fdf4',
            padding: '0.15rem 0.6rem',
            borderRadius: '9999px',
          }}
        >
          {onShiftAvail.length} available now
        </span>
      </div>

      {isLoading && <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Loading team…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* On-shift & available */}
        {onShiftAvail.map((t) => (
          <TechCard key={t.id} tech={t} status="available" />
        ))}
        {/* On-shift & busy */}
        {onShiftBusy.map((t) => (
          <TechCard key={t.id} tech={t} status="busy" />
        ))}
        {/* Off-shift */}
        {offShift.map((t) => (
          <TechCard key={t.id} tech={t} status="off-shift" />
        ))}
      </div>
    </section>
  );
};

interface TechCardProps {
  tech: Technician;
  status: 'available' | 'busy' | 'off-shift';
}

const STATUS_CFG = {
  available:  { dot: '#22c55e', label: 'Available', labelColor: '#16a34a' },
  busy:       { dot: '#f59e0b', label: 'On Job',    labelColor: '#b45309' },
  'off-shift':{ dot: '#94a3b8', label: 'Off Shift', labelColor: '#64748b' },
};

const TechCard: React.FC<TechCardProps> = ({ tech, status }) => {
  const cfg = STATUS_CFG[status];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.625rem 0.875rem',
        borderRadius: '8px',
        background: 'var(--color-surface, #fff)',
        border: `1px solid ${status === 'available' ? '#bbf7d0' : status === 'busy' ? '#fde68a' : 'var(--color-border, #e2e8f0)'}`,
        borderLeft: `3px solid ${cfg.dot}`,
      }}
    >
      {/* Status dot */}
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: cfg.dot,
          marginTop: '4px',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text, #111)' }}>{tech.name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted, #555)' }}>{tech.specialty}</div>
        {tech.currentAssignmentMachineName && (
          <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 500 }}>
            Assigned: {tech.currentAssignmentMachineName}
          </div>
        )}
        {tech.estimatedFreeAt && (
          <div style={{ fontSize: '0.7rem', color: 'var(--color-muted, #888)' }}>
            Free ~{new Date(tech.estimatedFreeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: cfg.labelColor,
          background: `${cfg.dot}22`,
          padding: '0.15rem 0.5rem',
          borderRadius: '9999px',
          flexShrink: 0,
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
};

export default TechnicianAvailability;
