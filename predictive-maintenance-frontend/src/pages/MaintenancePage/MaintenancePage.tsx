import React from 'react';
import PredictiveInsights from '../../components/maintenance/PredictiveInsights';
import MaintenanceHistory from '../../components/maintenance/MaintenanceHistory';
import TechnicianAvailability from '../../components/dashboard/TechnicianAvailability';
import { useQuery } from 'react-query';
import { maintenanceApi } from '../../services/api/maintenanceApi';

interface WorkOrder {
  id: string; title: string; machineName: string; type: string;
  status: string; scheduledDate: string; assignedTo?: string; description?: string;
}

const WO_STATUS: Record<string, { color: string; bg: string; icon: string }> = {
  pending:     { color: '#f59e0b', bg: '#fffbeb', icon: '•' },
  scheduled:   { color: '#1a56db', bg: '#eff6ff', icon: '•' },
  in_progress: { color: '#8b5cf6', bg: '#f5f3ff', icon: '•' },
  completed:   { color: '#059669', bg: '#f0fdf4', icon: '✓' },
  cancelled:   { color: '#94a3b8', bg: '#f8fafc', icon: '×' },
};

const WO_TYPE: Record<string, { icon: string; color: string }> = {
  predictive: { icon: 'P', color: '#8b5cf6' },
  preventive: { icon: 'V', color: '#1a56db' },
  corrective: { icon: 'C', color: '#f97316' },
  emergency:  { icon: 'E', color: '#dc2626' },
};

const MaintenancePage: React.FC = () => {
  const { data, isLoading } = useQuery('maintenance', () =>
    maintenanceApi.getAll().then((r) => r.data.data)
  );
  const records: WorkOrder[] = data?.items ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Maintenance</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-muted)' }}>
          Work orders, predictions, and technician management
        </p>
      </div>

      <PredictiveInsights />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Work Orders</h2>
            {records.length > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: 'var(--color-muted)',
                background: 'var(--color-bg, #f8fafc)', padding: '3px 10px', borderRadius: 12,
                border: '1px solid var(--color-border, #e2e8f0)',
              }}>
                {records.length} total
              </span>
            )}
          </div>

          {isLoading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
              Loading work orders…
            </div>
          )}
          {!isLoading && records.length === 0 && (
            <div style={{
              padding: '2rem', textAlign: 'center', color: 'var(--color-muted)',
              background: 'var(--color-surface, #fff)', borderRadius: 12,
              border: '1px solid var(--color-border, #e2e8f0)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 13 }}>No work orders found</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {records.map((r) => {
              const statusCfg = WO_STATUS[r.status] ?? WO_STATUS.pending;
              const typeCfg = WO_TYPE[r.type] ?? WO_TYPE.corrective;
              return (
                <div key={r.id} style={{
                  background: 'var(--color-surface, #fff)',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: 12, padding: '1rem 1.25rem',
                  borderLeft: `4px solid ${typeCfg.color}`,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateX(2px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px var(--color-card-shadow, rgba(0,0,0,0.06))';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{
                      fontWeight: 700, fontSize: 14, color: 'var(--color-text)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span>{typeCfg.icon}</span>
                      {r.title}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: statusCfg.color,
                      background: statusCfg.bg, padding: '2px 8px', borderRadius: 8,
                      textTransform: 'uppercase',
                    }}>
                      {statusCfg.icon} {r.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--color-muted, #64748b)',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  }}>
                    <span>{r.machineName}</span>
                    <span style={{ color: typeCfg.color, fontWeight: 600 }}>{r.type}</span>
                    <span>{r.scheduledDate}</span>
                    {r.assignedTo && <span>{r.assignedTo}</span>}
                  </div>
                  {r.description && (
                    <div style={{
                      fontSize: 12, color: 'var(--color-subtle, #94a3b8)',
                      marginTop: 6, lineHeight: 1.5, padding: '6px 8px',
                      background: 'var(--color-bg, #f8fafc)', borderRadius: 6,
                    }}>
                      {r.description.slice(0, 200)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <TechnicianAvailability />
      </div>

      {/* Maintenance History Table */}
      <div style={{
        background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem',
        border: '1px solid var(--color-border)',
      }}>
        <MaintenanceHistory />
      </div>
    </div>
  );
};

export default MaintenancePage;
