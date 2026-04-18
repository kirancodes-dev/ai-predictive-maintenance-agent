import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import DashboardOverview from '../../components/dashboard/DashboardOverview';
import MachineGrid from '../../components/dashboard/MachineGrid';
import AlertPanel from '../../components/dashboard/AlertPanel';
import FailurePredictionPanel from '../../components/dashboard/FailurePredictionPanel';
import TechnicianAvailability from '../../components/dashboard/TechnicianAvailability';
import LiveSensorCharts from '../../components/dashboard/LiveSensorCharts';
import ReportAlertModal from '../../components/dashboard/ReportAlertModal';
import SystemOverviewPie from '../../components/dashboard/SystemOverviewPie';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';
import { useMachineData } from '../../hooks/useMachineData';
import { useAlerts, useAlertSummary, useAcknowledgeAlert, useResolveAlert } from '../../hooks/useAlerts';
import { streamApi } from '../../services/api/streamApi';
import type { SensorReadingDto } from '../../services/api/streamApi';

const MACHINE_IDS = ['CNC_01', 'CNC_02', 'PUMP_03', 'CONVEYOR_04'];

const DashboardPage: React.FC = () => {
  const qc = useQueryClient();
  const { data: machinesData, isLoading: machinesLoading } = useMachineData();
  const { data: alertsData } = useAlerts({ status: ['active'] });
  const { data: summary } = useAlertSummary();
  const { mutate: acknowledge } = useAcknowledgeAlert();
  const { mutate: resolve } = useResolveAlert();
  const [showReportModal, setShowReportModal] = useState(false);

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


  const totalMachines = machinesData?.total ?? 0;
  const onlineMachines = machines.filter((m) => m.status !== 'offline' && m.status !== 'maintenance').length;
  const criticalMachines = machines.filter((m) => m.riskLevel === 'critical' || m.status === 'critical').length;
  const warningMachines = machines.filter((m) => m.riskLevel === 'high' || m.status === 'warning').length;

  // Compute system health: 100 - (weighted penalties)
  const healthScore = totalMachines > 0
    ? Math.max(0, Math.round(100
      - (criticalMachines * 25)
      - (warningMachines * 10)
      - ((totalMachines - onlineMachines) * 15)
      - Math.min(20, (summary?.active ?? 0) * 2)))
    : 100;

  const healthColor = healthScore >= 80 ? '#059669' : healthScore >= 60 ? '#f59e0b' : '#dc2626';
  const healthLabel = healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Needs Attention' : 'Critical';

  const stats = [
    {
      label: 'System Health',
      value: `${healthScore}%`,
      icon: '💚',
      color: healthColor,
      trend: healthLabel,
    },
    {
      label: 'Total Machines',
      value: totalMachines,
      icon: '🏭',
      color: '#1a56db',
      trend: `${onlineMachines} online · ${totalMachines - onlineMachines} offline`,
    },
    {
      label: 'Active Alerts',
      value: summary?.active ?? alerts.length,
      icon: '🔔',
      color: (summary?.active ?? alerts.length) > 0 ? '#dc2626' : '#059669',
      trend: summary
        ? `${summary.critical} critical · ${summary.acknowledged} acknowledged`
        : undefined,
    },
    {
      label: 'Critical Risk',
      value: criticalMachines,
      icon: '⚠️',
      color: criticalMachines > 0 ? '#dc2626' : '#059669',
      trend: warningMachines > 0 ? `${warningMachines} high risk` : 'All within safe range',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header with Report Alert button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Operations Dashboard
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-muted)' }}>
            Real-time overview · auto-refreshes every 5s · alerts broadcast via WebSocket
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            to="/agent"
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              background: 'var(--color-surface)',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
            }}
          >
            🤖 AI Agent
          </Link>
          <button
            onClick={() => setShowReportModal(true)}
          style={{
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 700,
            border: '1.5px solid #dc2626',
            borderRadius: 8,
            background: 'rgba(220, 38, 38, 0.08)',
            color: '#dc2626',
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#dc2626';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
            e.currentTarget.style.color = '#dc2626';
          }}
        >
          + Report Alert
        </button>
        </div>
      </div>

      <DashboardOverview stats={stats} />

      {/* ── Real-Time Sensor Trend Charts ── */}
      <LiveSensorCharts liveData={liveData} machineIds={MACHINE_IDS} />

      <FailurePredictionPanel />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Machines
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-subtle, #94a3b8)', marginLeft: 8 }}>
              live sensor values · 5s refresh
            </span>
          </h2>
          <MachineGrid machines={machines} isLoading={machinesLoading} liveData={liveData} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <SystemOverviewPie machines={machines} />
          <ActivityTimeline />
          <AlertPanel alerts={alerts} onAcknowledge={acknowledge} onResolve={resolve} />
        </div>
      </div>

      <TechnicianAvailability />

      {showReportModal && (
        <ReportAlertModal onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
};

export default DashboardPage;
