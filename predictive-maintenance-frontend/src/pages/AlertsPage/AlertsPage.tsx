import React from 'react';
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '../../hooks/useAlerts';
import AlertPanel from '../../components/dashboard/AlertPanel';

const AlertsPage: React.FC = () => {
  const { data, isLoading } = useAlerts({});
  const { mutate: acknowledge } = useAcknowledgeAlert();
  const { mutate: resolve } = useResolveAlert();
  const alerts = data?.items ?? [];

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>🚨 All Alerts</h1>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <AlertPanel alerts={alerts} onAcknowledge={acknowledge} onResolve={resolve} />
      )}
    </div>
  );
};

export default AlertsPage;
