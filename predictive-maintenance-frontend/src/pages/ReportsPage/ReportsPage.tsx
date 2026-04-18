import React, { useCallback } from 'react';
import { useQuery } from 'react-query';
import { apiClient } from '../../services/api/apiClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

const ReportsPage: React.FC = () => {
  const { data: machines } = useQuery('report-machines', () =>
    apiClient.get('/machines', { params: { limit: 100 } }).then(r => {
      const d = r.data?.data;
      return d?.items || (Array.isArray(d) ? d : []);
    })
  );

  const { data: predictions } = useQuery('report-predictions', () =>
    apiClient.get('/predictions/live').then(r => r.data?.data || [])
  );

  const { data: alerts } = useQuery('report-alerts', () =>
    apiClient.get('/alerts').then(r => {
      const d = r.data?.data;
      return Array.isArray(d) ? d : d?.items || [];
    })
  );

  const { data: maintenance } = useQuery('report-maintenance', () =>
    apiClient.get('/maintenance').then(r => {
      const d = r.data?.data;
      return Array.isArray(d) ? d : d?.items || [];
    })
  );

  const { data: mlStatus } = useQuery('report-ml', () =>
    apiClient.get('/ml/status').then(r => r.data?.data)
  );

  // KPIs
  const totalMachines = machines?.length || 0;
  const criticalMachines = machines?.filter((m: any) => m.riskScore >= 70).length || 0;
  const activeAlerts = alerts?.filter((a: any) => a.status === 'active').length || 0;
  const resolvedAlerts = alerts?.filter((a: any) => a.status === 'resolved').length || 0;
  const scheduledMaint = maintenance?.filter((m: any) => m.status === 'scheduled').length || 0;
  const completedMaint = maintenance?.filter((m: any) => m.status === 'completed').length || 0;

  // Risk distribution for pie chart
  const riskDistribution = [
    { name: 'Low (0-30)', value: machines?.filter((m: any) => m.riskScore < 30).length || 0 },
    { name: 'Medium (30-60)', value: machines?.filter((m: any) => m.riskScore >= 30 && m.riskScore < 60).length || 0 },
    { name: 'High (60-80)', value: machines?.filter((m: any) => m.riskScore >= 60 && m.riskScore < 80).length || 0 },
    { name: 'Critical (80+)', value: machines?.filter((m: any) => m.riskScore >= 80).length || 0 },
  ].filter(d => d.value > 0);

  // Prediction urgency bar chart
  const urgencyData = ['low', 'medium', 'high', 'critical', 'imminent'].map(u => ({
    urgency: u.charAt(0).toUpperCase() + u.slice(1),
    count: predictions?.filter((p: any) => p.urgency === u).length || 0,
  }));

  // Alert severity bar chart
  const severityData = ['info', 'warning', 'error', 'critical'].map(s => ({
    severity: s.charAt(0).toUpperCase() + s.slice(1),
    count: alerts?.filter((a: any) => a.severity === s).length || 0,
  }));

  // Build full JSON report
  const buildJsonReport = useCallback(() => {
    const now = new Date().toISOString();
    return {
      reportMetadata: {
        generatedAt: now,
        reportType: 'predictive-maintenance-summary',
        version: '1.0',
      },
      summary: {
        totalMachines,
        criticalRiskMachines: criticalMachines,
        activeAlerts,
        resolvedAlerts,
        scheduledMaintenanceJobs: scheduledMaint,
        completedMaintenanceJobs: completedMaint,
      },
      riskDistribution: riskDistribution.map(r => ({ category: r.name, machineCount: r.value })),
      predictionUrgencyBreakdown: urgencyData.map(u => ({ urgency: u.urgency, count: u.count })),
      alertSeverityBreakdown: severityData.map(s => ({ severity: s.severity, count: s.count })),
      machines: (machines || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        riskScore: m.riskScore,
        location: m.location,
        model: m.model,
      })),
      predictions: (predictions || []).map((p: any) => ({
        machineId: p.machine_id,
        machineName: p.machine_name,
        estimatedHoursRemaining: p.estimated_hours_remaining,
        confidence: p.confidence,
        failureType: p.failure_type,
        urgency: p.urgency,
        recommendation: p.recommendation,
        assignedTechnician: p.assigned_technician_name || null,
        workOrderId: p.work_order_id || null,
      })),
      alerts: (alerts || []).map((a: any) => ({
        id: a.id,
        machineId: a.machineId,
        severity: a.severity,
        status: a.status,
        message: a.message,
        sensorType: a.sensorType,
        sensorValue: a.sensorValue,
        threshold: a.threshold,
        createdAt: a.createdAt,
        acknowledgedBy: a.acknowledgedBy || null,
      })),
      maintenance: (maintenance || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        machineName: m.machineName,
        type: m.type,
        status: m.status,
        scheduledDate: m.scheduledDate,
        assignedTo: m.assignedTo || null,
        description: m.description || null,
      })),
      mlModelStatus: mlStatus ? {
        modelReady: mlStatus.model_ready,
        featureColumns: mlStatus.feature_columns,
        featureStats: mlStatus.feature_stats,
      } : null,
    };
  }, [machines, predictions, alerts, maintenance, mlStatus,
      totalMachines, criticalMachines, activeAlerts, resolvedAlerts,
      scheduledMaint, completedMaint, riskDistribution, urgencyData, severityData]);

  const downloadJson = useCallback(() => {
    const report = buildJsonReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [buildJsonReport]);

  const [showJsonPreview, setShowJsonPreview] = React.useState(false);

  const downloadCsv = useCallback(() => {
    const rows: string[][] = [];
    // Machine summary
    rows.push(['=== MACHINE SUMMARY ===']);
    rows.push(['ID', 'Name', 'Status', 'Risk Score', 'Risk Level', 'Location', 'Model']);
    (machines || []).forEach((m: any) => {
      rows.push([m.id, m.name, m.status, String(m.riskScore), m.riskLevel || '', m.location || '', m.model || '']);
    });
    rows.push([]);
    // Predictions
    rows.push(['=== FAILURE PREDICTIONS ===']);
    rows.push(['Machine ID', 'Machine Name', 'Hours Remaining', 'Confidence', 'Failure Type', 'Urgency', 'Recommendation']);
    (predictions || []).forEach((p: any) => {
      rows.push([p.machine_id, p.machine_name, String(p.estimated_hours_remaining?.toFixed(1) || ''), String((p.confidence * 100).toFixed(0) + '%'), p.failure_type, p.urgency, p.recommendation || '']);
    });
    rows.push([]);
    // Alerts
    rows.push(['=== ALERTS ===']);
    rows.push(['ID', 'Machine', 'Severity', 'Status', 'Message', 'Created At']);
    (alerts || []).forEach((a: any) => {
      rows.push([a.id, a.machineId || a.machineName || '', a.severity, a.status, (a.message || '').replace(/,/g, ';'), a.createdAt || '']);
    });
    rows.push([]);
    // Maintenance
    rows.push(['=== MAINTENANCE RECORDS ===']);
    rows.push(['ID', 'Title', 'Machine', 'Type', 'Status', 'Scheduled Date']);
    (maintenance || []).forEach((m: any) => {
      rows.push([m.id, m.title || '', m.machineName || '', m.type || '', m.status || '', m.scheduledDate || '']);
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [machines, predictions, alerts, maintenance]);

  const kpiStyle = {
    background: 'var(--color-surface, #fff)', borderRadius: 10, padding: '1.25rem',
    border: '1px solid var(--color-border, #e2e8f0)', textAlign: 'center' as const,
    transition: 'transform 0.15s, box-shadow 0.15s',
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Reports & Analytics</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-muted)' }}>
            System health overview and exportable reports
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowJsonPreview(!showJsonPreview)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid var(--color-border, #e2e8f0)',
              background: showJsonPreview ? 'var(--color-primary, #1a56db)' : 'var(--color-surface, #fff)',
              color: showJsonPreview ? '#fff' : 'var(--color-text, #334155)',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {'{ }'} {showJsonPreview ? 'Hide JSON' : 'Preview JSON'}
          </button>
          <button
            onClick={downloadCsv}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid #22c55e',
              background: 'rgba(34,197,94,0.08)', color: '#22c55e',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#22c55e'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; e.currentTarget.style.color = '#22c55e'; }}
          >
            📊 Export CSV
          </button>
          <button
            onClick={downloadJson}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: 'none',
              background: '#1a56db',
              color: '#fff', cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(26,86,219,0.3)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            ⬇ Download JSON
          </button>
        </div>
      </div>

      {/* JSON Preview Panel */}
      {showJsonPreview && (
        <div style={{
          background: 'var(--color-surface, #fff)', borderRadius: 12,
          border: '1px solid var(--color-border, #e2e8f0)',
          marginBottom: '1.5rem', overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1.25rem',
            background: 'var(--color-bg, #f8fafc)',
            borderBottom: '1px solid var(--color-border, #e2e8f0)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>{ }</span> Report JSON Preview
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(buildJsonReport(), null, 2));
                }}
                style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: '1px solid var(--color-border, #e2e8f0)',
                  background: 'var(--color-surface, #fff)',
                  color: 'var(--color-text, #334155)',
                  cursor: 'pointer',
                }}
              >
                Copy
              </button>
            </div>
          </div>
          <pre style={{
            margin: 0, padding: '1rem 1.25rem',
            fontSize: 12, lineHeight: 1.6,
            color: 'var(--color-text, #334155)',
            maxHeight: 400, overflow: 'auto',
            fontFamily: '"SF Mono", "Fira Code", monospace',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {JSON.stringify(buildJsonReport(), null, 2)}
          </pre>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-muted, #64748b)' }}>Total Machines</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text, #1e293b)' }}>{totalMachines}</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-muted, #64748b)' }}>Critical Risk</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{criticalMachines}</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-muted, #64748b)' }}>Active Alerts</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{activeAlerts}</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-muted, #64748b)' }}>Resolved Alerts</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{resolvedAlerts}</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-muted, #64748b)' }}>Scheduled Jobs</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{scheduledMaint}</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-muted, #64748b)' }}>Completed Jobs</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{completedMaint}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Risk Distribution */}
        <div style={{ background: 'var(--color-surface, #fff)', borderRadius: 8, padding: '1.25rem', border: '1px solid var(--color-border, #e2e8f0)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Risk Distribution</h3>
          {riskDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {riskDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>No data</div>
          )}
        </div>

        {/* Prediction Urgency */}
        <div style={{ background: 'var(--color-surface, #fff)', borderRadius: 8, padding: '1.25rem', border: '1px solid var(--color-border, #e2e8f0)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Prediction Urgency Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={urgencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="urgency" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alert Severity + ML Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--color-surface, #fff)', borderRadius: 8, padding: '1.25rem', border: '1px solid var(--color-border, #e2e8f0)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Alert Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="severity" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--color-surface, #fff)', borderRadius: 8, padding: '1.25rem', border: '1px solid var(--color-border, #e2e8f0)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>ML Model Status</h3>
          {mlStatus ? (
            <div style={{ fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: mlStatus.model_ready ? '#10b981' : '#ef4444',
                  display: 'inline-block',
                }} />
                <span style={{ fontWeight: 600 }}>
                  {mlStatus.model_ready ? 'Model Ready' : 'Model Not Trained'}
                </span>
              </div>
              <div style={{ color: 'var(--color-muted)', display: 'grid', gap: 4 }}>
                <div>Features: {mlStatus.feature_columns?.join(', ')}</div>
                {mlStatus.feature_stats && Object.entries(mlStatus.feature_stats).map(([k, v]: [string, any]) => (
                  <div key={k}>{k}: mean={v.mean?.toFixed(2)}, std={v.std?.toFixed(2)}</div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--color-muted)' }}>Loading...</div>
          )}
        </div>
      </div>

      {/* Predictions Table */}
      {predictions && predictions.length > 0 && (
        <div style={{ background: 'var(--color-surface, #fff)', borderRadius: 8, padding: '1.25rem', border: '1px solid var(--color-border, #e2e8f0)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>All Predictions</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Machine</th>
                <th style={{ padding: '0.5rem' }}>Hours Left</th>
                <th style={{ padding: '0.5rem' }}>Confidence</th>
                <th style={{ padding: '0.5rem' }}>Failure Type</th>
                <th style={{ padding: '0.5rem' }}>Urgency</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p: any) => (
                <tr key={p.machine_id || p.machine_name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.5rem' }}>{p.machine_name}</td>
                  <td style={{ padding: '0.5rem' }}>{p.estimated_hours_remaining?.toFixed(1)}</td>
                  <td style={{ padding: '0.5rem' }}>{(p.confidence * 100).toFixed(0)}%</td>
                  <td style={{ padding: '0.5rem' }}>{p.failure_type}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                      background: p.urgency === 'critical' || p.urgency === 'imminent'
                        ? 'rgba(239,68,68,0.12)' : p.urgency === 'high'
                        ? 'rgba(249,115,22,0.12)' : 'rgba(16,185,129,0.12)',
                      color: p.urgency === 'critical' || p.urgency === 'imminent'
                        ? '#ef4444' : p.urgency === 'high'
                        ? '#f97316' : '#10b981',
                    }}>
                      {p.urgency?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
