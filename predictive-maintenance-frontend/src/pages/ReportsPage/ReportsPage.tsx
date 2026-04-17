import React from 'react';
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

  const kpiStyle = {
    background: '#fff', borderRadius: 8, padding: '1.25rem',
    border: '1px solid #e2e8f0', textAlign: 'center' as const,
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>📊 Reports & Analytics</h1>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total Machines</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{totalMachines}</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Critical Risk</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{criticalMachines}</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Active Alerts</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{activeAlerts}</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Resolved Alerts</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{resolvedAlerts}</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Scheduled Jobs</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{scheduledMaint}</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Completed Jobs</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{completedMaint}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Risk Distribution */}
        <div style={{ background: '#fff', borderRadius: 8, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
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
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No data</div>
          )}
        </div>

        {/* Prediction Urgency */}
        <div style={{ background: '#fff', borderRadius: 8, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Prediction Urgency Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={urgencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
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
        <div style={{ background: '#fff', borderRadius: 8, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Alert Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="severity" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#fff', borderRadius: 8, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>🤖 ML Model Status</h3>
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
              <div style={{ color: '#64748b', display: 'grid', gap: 4 }}>
                <div>Features: {mlStatus.feature_columns?.join(', ')}</div>
                {mlStatus.feature_stats && Object.entries(mlStatus.feature_stats).map(([k, v]: [string, any]) => (
                  <div key={k}>{k}: mean={v.mean?.toFixed(2)}, std={v.std?.toFixed(2)}</div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#94a3b8' }}>Loading...</div>
          )}
        </div>
      </div>

      {/* Predictions Table */}
      {predictions && predictions.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 8, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>🔮 All Predictions</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Machine</th>
                <th style={{ padding: '0.5rem' }}>Hours Left</th>
                <th style={{ padding: '0.5rem' }}>Confidence</th>
                <th style={{ padding: '0.5rem' }}>Failure Type</th>
                <th style={{ padding: '0.5rem' }}>Urgency</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem' }}>{p.machine_name}</td>
                  <td style={{ padding: '0.5rem' }}>{p.estimated_hours_remaining?.toFixed(1)}</td>
                  <td style={{ padding: '0.5rem' }}>{(p.confidence * 100).toFixed(0)}%</td>
                  <td style={{ padding: '0.5rem' }}>{p.failure_type}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                      background: p.urgency === 'critical' || p.urgency === 'imminent' ? '#fef2f2' : p.urgency === 'high' ? '#fff7ed' : '#f0fdf4',
                      color: p.urgency === 'critical' || p.urgency === 'imminent' ? '#991b1b' : p.urgency === 'high' ? '#9a3412' : '#166534',
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
