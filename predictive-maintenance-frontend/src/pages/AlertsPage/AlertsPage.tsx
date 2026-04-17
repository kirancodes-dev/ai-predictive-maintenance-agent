import React, { useState, useMemo } from 'react';
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '../../hooks/useAlerts';
import AlertPanel from '../../components/dashboard/AlertPanel';
import type { AlertSeverity, AlertStatus } from '../../types/alert.types';

const SEVERITY_OPTIONS: { value: AlertSeverity | 'all'; label: string; icon: string; color: string }[] = [
  { value: 'all',      label: 'All',      icon: '📋', color: '#64748b' },
  { value: 'critical', label: 'Critical', icon: '🔴', color: '#ef4444' },
  { value: 'error',    label: 'Error',    icon: '🔶', color: '#f97316' },
  { value: 'warning',  label: 'Warning',  icon: '⚠️', color: '#f59e0b' },
  { value: 'info',     label: 'Info',     icon: 'ℹ️', color: '#3b82f6' },
];

const STATUS_OPTIONS: { value: AlertStatus | 'all'; label: string; color: string }[] = [
  { value: 'all',          label: 'All Statuses',  color: '#64748b' },
  { value: 'active',       label: 'Active',        color: '#ef4444' },
  { value: 'acknowledged', label: 'Acknowledged',  color: '#3b82f6' },
  { value: 'resolved',     label: 'Resolved',      color: '#22c55e' },
];

const MACHINE_OPTIONS = [
  { value: 'all', label: 'All Machines' },
  { value: 'CNC_01', label: 'CNC Machine #1' },
  { value: 'CNC_02', label: 'CNC Machine #2' },
  { value: 'PUMP_03', label: 'Pump #3' },
  { value: 'CONVEYOR_04', label: 'Conveyor #4' },
];

const chipStyle = (active: boolean, color: string): React.CSSProperties => ({
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: active ? 700 : 500,
  borderRadius: 20,
  border: `1.5px solid ${active ? color : 'var(--color-border, #e2e8f0)'}`,
  background: active ? `${color}15` : 'transparent',
  color: active ? color : 'var(--color-muted, #64748b)',
  cursor: 'pointer',
  transition: 'all 0.15s',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  whiteSpace: 'nowrap' as const,
});

const selectStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid var(--color-border, #e2e8f0)',
  background: 'var(--color-surface, #fff)',
  color: 'var(--color-text, #1e293b)',
  cursor: 'pointer',
  fontWeight: 500,
};

const AlertsPage: React.FC = () => {
  const [severity, setSeverity] = useState<AlertSeverity | 'all'>('all');
  const [status, setStatus] = useState<AlertStatus | 'all'>('all');
  const [machineId, setMachineId] = useState('all');

  // Build query params
  const queryParams = useMemo(() => {
    const p: Record<string, unknown> = { limit: 100 };
    if (status !== 'all') p.status = [status];
    if (severity !== 'all') p.severity = severity;
    if (machineId !== 'all') p.machineId = machineId;
    return p;
  }, [severity, status, machineId]);

  const { data, isLoading } = useAlerts(queryParams);
  const { mutate: acknowledge } = useAcknowledgeAlert();
  const { mutate: resolve } = useResolveAlert();
  const alerts = data?.items ?? [];
  const total = data?.total ?? 0;

  // Summary counts (from current results)
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const activeCount = alerts.filter((a) => a.status === 'active').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
          🚨 Alert Management
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-muted, #94a3b8)' }}>
          Monitor and manage system alerts across all machines
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Alerts', value: total, icon: '📊', color: '#3b82f6' },
          { label: 'Active', value: activeCount, icon: '🔴',
            color: activeCount > 0 ? '#ef4444' : '#22c55e' },
          { label: 'Critical', value: criticalCount, icon: '⚠️',
            color: criticalCount > 0 ? '#ef4444' : '#22c55e' },
        ].map((s) => (
          <div key={s.label} style={{
            padding: '12px 20px',
            borderRadius: 10,
            border: '1px solid var(--color-border, #e2e8f0)',
            background: 'var(--color-surface, #fff)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 140,
          }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <div style={{
                fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'monospace',
              }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--color-muted, #94a3b8)', fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '16px',
        borderRadius: 10,
        border: '1px solid var(--color-border, #e2e8f0)',
        background: 'var(--color-surface, #fff)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted, #64748b)' }}>
          FILTERS
        </div>

        {/* Severity chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--color-muted, #94a3b8)', minWidth: 60 }}>
            Severity:
          </span>
          {SEVERITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSeverity(opt.value)}
              style={chipStyle(severity === opt.value, opt.color)}
            >
              <span>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Status + Machine dropdowns */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--color-muted, #94a3b8)' }}>Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AlertStatus | 'all')}
              style={selectStyle}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--color-muted, #94a3b8)' }}>Machine:</span>
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              style={selectStyle}
            >
              {MACHINE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alert list */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>
          Loading alerts…
        </div>
      ) : (
        <AlertPanel
          alerts={alerts}
          onAcknowledge={acknowledge}
          onResolve={resolve}
          maxHeight="none"
          title={`Showing ${alerts.length} of ${total} alerts`}
        />
      )}
    </div>
  );
};

export default AlertsPage;
