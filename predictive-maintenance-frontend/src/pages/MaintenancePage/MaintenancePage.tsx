import React from 'react';
import PredictiveInsights from '../../components/maintenance/PredictiveInsights';
import TechnicianAvailability from '../../components/dashboard/TechnicianAvailability';
import { useQuery } from 'react-query';
import { maintenanceApi } from '../../services/api/maintenanceApi';

interface WorkOrder {
  id: string;
  title: string;
  machineName: string;
  type: string;
  status: string;
  scheduledDate: string;
  assignedTo?: string;
  description?: string;
}

const MaintenancePage: React.FC = () => {
  const { data, isLoading } = useQuery('maintenance', () =>
    maintenanceApi.getAll().then((r) => r.data.data)
  );
  const records: WorkOrder[] = data?.items ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>🔧 Maintenance</h1>

      <PredictiveInsights />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Work Orders</h2>
          {isLoading && <p>Loading…</p>}
          {!isLoading && records.length === 0 && <p style={{ color: '#888' }}>No work orders found.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {records.map((r) => (
              <div
                key={r.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{r.title}</div>
                <div style={{ fontSize: '0.8125rem', color: '#555', marginTop: '0.25rem' }}>
                  {r.machineName} · {r.type} · {r.status}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#888', marginTop: '0.25rem' }}>
                  Scheduled: {r.scheduledDate}
                  {r.assignedTo && ` · Assigned: ${r.assignedTo}`}
                </div>
                {r.description && (
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem', whiteSpace: 'pre-line' }}>
                    {r.description.slice(0, 200)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <TechnicianAvailability />
      </div>
    </div>
  );
};

export default MaintenancePage;
