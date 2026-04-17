import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import DashboardOverview from '../../components/dashboard/DashboardOverview';
import MachineGrid from '../../components/dashboard/MachineGrid';
import AlertPanel from '../../components/dashboard/AlertPanel';
import FailurePredictionPanel from '../../components/dashboard/FailurePredictionPanel';
import TechnicianAvailability from '../../components/dashboard/TechnicianAvailability';
import LiveSensorCharts from '../../components/dashboard/LiveSensorCharts';
import { useMachineData } from '../../hooks/useMachineData';
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '../../hooks/useAlerts';
import { useWebSocket } from '../../hooks/useWebSocket';
import { streamApi } from '../../services/api/streamApi';
import type { SensorReadingDto } from '../../services/api/streamApi';
import toast from 'react-hot-toast';

const MACHINE_IDS = ['CNC_01', 'CNC_02', 'PUMP_03', 'CONVEYOR_04'];

const DashboardPage: React.FC = () => {
  const qc = useQueryClient();
  const { data: machinesData, isLoading: machinesLoading } = useMachineData();
  const { data: alertsData } = useAlerts({ status: ['active'] });
  const { mutate: acknowledge } = useAcknowledgeAlert();
  const { mutate: resolve } = useResolveAlert();

  const machines = machinesData?.items ?? [];
  const alerts = alertsData?.items ?? [];

  // Poll latest sensor values for each machine every 5 seconds
  const liveQueries = MACHINE_IDS.map((id) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery(
      ['live', id],
      () => streamApi.getLive(id).then((r) => r.data.data),
      { refetchInterval: 5_000, staleTime: 4_000, retry: 0 },
    ),
  );

  const liveData: Record<string, SensorReadingDto[]> = {};
  MACHINE_IDS.forEach((id, i) => {
    liveData[id] = liveQueries[i].data ?? [];
  });

  // WebSocket for real-time alerts and notifications
  useWebSocket({
    path: '/ws/CNC_01',
    onMessage: (type, payload) => {
      const p = payload as Record<string, unknown>;
      if (type === 'pre_failure_alert') {
        const hours = (p.estimatedHoursRemaining as number) ?? 0;
        const label = hours < 1 ? `${Math.round(hours * 60)}min`
          : hours < 24 ? `${Math.round(hours)}h` : `${Math.floor(hours / 24)}d`;
        toast.error(`⚠️ ${p.machineName}: Failure in ${label} — ${p.failureType}`,
          { duration: 8000, id: `pfa-${p.machineId}` });
      }
      if (type === 'technician_assigned') {
        toast.success(`👷 ${p.technicianName} auto-dispatched to ${p.machineName}`,
          { duration: 6000, id: `ta-${p.machineId}` });
      }
      if (type === 'alert') {
        qc.invalidateQueries('alerts');
      }
    },
  });

  const onlineMachines = machines.filter((m) => m.status !== 'offline' && m.status !== 'maintenance').length;
  const criticalMachines = machines.filter((m) => m.riskLevel === 'critical' || m.status === 'critical').length;

  const stats = [
    { label: 'Total Machines', value: machinesData?.total ?? 0, icon: '🏭', color: '#3b82f6' },
    { label: 'Active Alerts',  value: alerts.length, icon: '🚨',
      color: alerts.length > 0 ? '#ef4444' : '#22c55e' },
    { label: 'Online',         value: onlineMachines, icon: '✅', color: '#22c55e' },
    { label: 'Critical Risk',  value: criticalMachines, icon: '⚠️',
      color: criticalMachines > 0 ? '#ef4444' : '#22c55e' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Operations Dashboard</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
          Live overview — sensor data refreshes every 5 seconds
        </p>
      </div>

      <DashboardOverview stats={stats} />

      {/* ── Real-Time Sensor Trend Charts ── */}
      <LiveSensorCharts liveData={liveData} machineIds={MACHINE_IDS} />

      <FailurePredictionPanel />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Machines
            <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
              live sensor values · 5s refresh
            </span>
          </h2>
          <MachineGrid machines={machines} isLoading={machinesLoading} liveData={liveData} />
        </div>
        <AlertPanel alerts={alerts} onAcknowledge={acknowledge} onResolve={resolve} />
      </div>

      <TechnicianAvailability />
    </div>
  );
};

export default DashboardPage;
