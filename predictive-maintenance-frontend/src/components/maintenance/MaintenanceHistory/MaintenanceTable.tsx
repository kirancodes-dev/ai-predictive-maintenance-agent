import React from 'react';
import type { MaintenanceRecord } from '../../../types/maintenance.types';
import { formatDate, formatDuration } from '../../../utils/formatters';

interface MaintenanceTableProps {
  records: MaintenanceRecord[];
}

const statusColors: Record<string, string> = {
  scheduled: '#3b82f6',
  'in-progress': '#f59e0b',
  completed: '#22c55e',
  cancelled: '#6b7280',
};

const MaintenanceTable: React.FC<MaintenanceTableProps> = ({ records }) => {
  if (records.length === 0) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>No maintenance records found.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
            {['Machine', 'Title', 'Type', 'Status', 'Scheduled', 'Duration'].map(h => (
              <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '0.625rem 0.75rem' }}>{r.machineName}</td>
              <td style={{ padding: '0.625rem 0.75rem', fontWeight: 500 }}>{r.title}</td>
              <td style={{ padding: '0.625rem 0.75rem', textTransform: 'capitalize' }}>{r.type}</td>
              <td style={{ padding: '0.625rem 0.75rem' }}>
                <span style={{
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  background: `${statusColors[r.status]}22`,
                  color: statusColors[r.status],
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}>
                  {r.status}
                </span>
              </td>
              <td style={{ padding: '0.625rem 0.75rem' }}>{formatDate(r.scheduledDate)}</td>
              <td style={{ padding: '0.625rem 0.75rem' }}>{formatDuration(r.estimatedDuration)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MaintenanceTable;
