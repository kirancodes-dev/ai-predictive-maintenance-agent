import React from 'react';
import DashboardOverview from '../../components/dashboard/DashboardOverview';
import MachineGrid from '../../components/dashboard/MachineGrid';
import AlertPanel from '../../components/dashboard/AlertPanel';
import PredictiveInsights from '../../components/maintenance/PredictiveInsights';
import { useMachineData } from '../../hooks/useMachineData';
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '../../hooks/useAlerts';

const DashboardPage: React.FC = () => {
  const { data: machinesData, isLoading: machinesLoading } = useMachineData();
  const { data: alertsData } = useAlerts({ status: ['active'] });
  const { mutate: acknowledge } = useAcknowledgeAlert();
  const { mutate: resolve } = useResolveAlert();

  const machines = machinesData?.items ?? [];
  const alerts = alertsData?.items ?? [];

  const stats = [
    { label: 'Total Machines', value: machinesData?.total ?? 0, icon: '🏭' },
    { label: 'Active Alerts', value: alerts.length, icon: '🚨' },
    { label: 'Online', value: machines.filter(m => m.status === 'online').length, icon: '✅' },
    { label: 'Critical Risk', value: machines.filter(m => m.riskLevel === 'critical').length, icon: '⚠️' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <DashboardOverview stats={stats} />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Machines</h2>
          <MachineGrid machines={machines} isLoading={machinesLoading} />
        </div>
        <AlertPanel
          alerts={alerts}
          onAcknowledge={acknowledge}
          onResolve={resolve}
        />
      </div>
      <PredictiveInsights />
    </div>
  );
};

export default DashboardPage;
