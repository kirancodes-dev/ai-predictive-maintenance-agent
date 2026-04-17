import React, { useState } from 'react';
import AlertPanel from '../../components/dashboard/AlertPanel';
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '../../hooks/useAlerts';
import type { AlertSeverity, AlertStatus } from '../../types/alert.types';

const AlertsPage: React.FC = () => {
  const [severity, setSeverity] = useState<AlertSeverity | ''>('');
  const [status, setStatus] = useState<AlertStatus | ''>('active');
  const { data } = useAlerts({
    ...(severity ? { severity: [severity] } : {}),
    ...(status ? { status: [status] } : {}),
  });
  const { mutate: acknowledge } = useAcknowledgeAlert();
  const { mutate: resolve } = useResolveAlert();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as AlertStatus | '')}
          style={{ padding: '0.375rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={severity}
          onChange={e => setSeverity(e.target.value as AlertSeverity | '')}
          style={{ padding: '0.375rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}
        >
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        }}
      >
        <AlertPanel
          alerts={data?.items ?? []}
          onAcknowledge={acknowledge}
          onResolve={resolve}
          maxItems={50}
        />
      </div>
    </div>
  );
};

export default AlertsPage;
