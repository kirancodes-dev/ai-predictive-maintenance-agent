import React from 'react';
import type { MaintenanceRecord } from '../../../types/maintenance.types';
import { formatDate } from '../../../utils/formatters';

interface MaintenanceCalendarProps {
  records: MaintenanceRecord[];
}

const MaintenanceCalendar: React.FC<MaintenanceCalendarProps> = ({ records }) => {
  const upcoming = records
    .filter(r => r.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.25rem' }}>
        Upcoming Scheduled
      </h4>
      {upcoming.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          No upcoming maintenance.
        </p>
      ) : (
        upcoming.map(record => (
          <div
            key={record.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.625rem 0.875rem',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{record.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                {record.machineName}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600 }}>{formatDate(record.scheduledDate)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                {record.type}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MaintenanceCalendar;
