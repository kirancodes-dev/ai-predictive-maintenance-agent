import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { apiClient } from '../../services/api/apiClient';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const SENSOR_COLORS: Record<string, string> = {
  temperature: '#ef4444',
  vibration: '#3b82f6',
  rpm: '#10b981',
  current: '#f59e0b',
};

const MachineDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [timeRange, setTimeRange] = useState('24h');

  const { data: machineData, isLoading: machineLoading } = useQuery(
    ['machine', id],
    () => apiClient.get(`/machines/${id}`).then(r => r.data?.data),
    { enabled: !!id }
  );

  const { data: predictionData } = useQuery(
    ['prediction', id],
    () => apiClient.get(`/predictions/${id}`).then(r => r.data?.data),
    { enabled: !!id }
  );

  const hoursMap: Record<string, number> = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };
  const fromDate = new Date(Date.now() - (hoursMap[timeRange] || 24) * 3600000).toISOString();

  const { data: historyData, isLoading: historyLoading } = useQuery(
    ['history', id, timeRange],
    () => apiClient.get(`/stream/${id}/history`, { params: { from: fromDate } }).then(r => r.data?.data),
    { enabled: !!id, refetchInterval: 30000 }
  );

  const { data: liveData } = useQuery(
    ['live', id],
    () => apiClient.get(`/stream/${id}/live`).then(r => r.data?.data),
    { enabled: !!id, refetchInterval: 5000 }
  );

  const { data: alertsData } = useQuery(
    ['machine-alerts', id],
    () => apiClient.get('/alerts', { params: { machineId: id, limit: 10 } }).then(r => {
      const d = r.data?.data;
      return Array.isArray(d) ? d : d?.items || [];
    }),
    { enabled: !!id }
  );

  if (machineLoading) {
    return <div style={{ padding: '2rem', color: 'var(--color-muted)' }}>Loading machine details...</div>;
  }

  if (!machineData) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Machine not found</h2>
        <Link to="/" style={{ color: 'var(--color-primary)' }}>← Back to Dashboard</Link>
      </div>
    );
  }

  const m = machineData;
  const pred = predictionData;

  // Build chart data from history
  const chartData: any[] = [];
  if (historyData && Array.isArray(historyData)) {
    const sensorMap: Record<string, { timestamp: string; value: number }[]> = {};
    historyData.forEach((sensor: any) => {
      sensorMap[sensor.type] = sensor.data || [];
    });

    const allTimestamps = new Set<string>();
    Object.values(sensorMap).forEach(points =>
      points.forEach(p => allTimestamps.add(p.timestamp))
    );

    Array.from(allTimestamps)
      .sort()
      .forEach(ts => {
        const point: any = { time: new Date(ts).toLocaleTimeString() };
        Object.entries(sensorMap).forEach(([type, points]) => {
          const match = points.find(p => p.timestamp === ts);
          if (match) point[type] = match.value;
        });
        chartData.push(point);
      });
  }

  const riskColor = m.riskScore >= 70 ? '#ef4444' : m.riskScore >= 40 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Link to="/" style={{ color: 'var(--color-primary, #1a56db)', textDecoration: 'none', fontSize: '0.875rem' }}>
        ← Back to Dashboard
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{m.name}</h1>
          <p style={{ color: 'var(--color-muted, #64748b)', margin: '4px 0 0', fontSize: 13 }}>{m.model} — {m.location}</p>
        </div>
        <div style={{
          padding: '0.5rem 1rem', borderRadius: 8,
          background: m.status === 'online' ? '#dcfce7' : '#fef2f2',
          color: m.status === 'online' ? '#166534' : '#991b1b',
          fontWeight: 600,
        }}>
          {m.status?.toUpperCase()}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', margin: '1.5rem 0' }}>
        <StatCard label="Risk Score" value={`${m.riskScore?.toFixed(0)}%`} color={riskColor} />
        <StatCard label="Risk Level" value={m.riskLevel?.toUpperCase()} color={riskColor} />
        <StatCard
          label="Predicted Failure"
          value={pred ? `${pred.estimatedHoursRemaining?.toFixed(0)}h` : 'N/A'}
          color={pred?.urgency === 'critical' || pred?.urgency === 'imminent' ? '#ef4444' : '#64748b'}
        />
        <StatCard
          label="Confidence"
          value={pred ? `${(pred.confidence * 100).toFixed(0)}%` : 'N/A'}
          color="#3b82f6"
        />
      </div>

      {/* Prediction Details */}
      {pred && (
        <div style={{ background: 'var(--color-surface, #fff)', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--color-border, #e2e8f0)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Failure Prediction</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div><span style={{ color: 'var(--color-muted)' }}>Failure Type:</span> {pred.failureType}</div>
            <div><span style={{ color: 'var(--color-muted)' }}>Urgency:</span> <span style={{ fontWeight: 600, color: pred.urgency === 'critical' ? '#ef4444' : '#f59e0b' }}>{pred.urgency?.toUpperCase()}</span></div>
            <div><span style={{ color: 'var(--color-muted)' }}>Assigned Tech:</span> {pred.assignedTechnicianName || 'Pending'}</div>
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--color-muted)' }}>Recommendation:</span> {pred.recommendation}</div>
          </div>
        </div>
      )}

      {/* Live Sensor Readings */}
      {liveData && Array.isArray(liveData) && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Live Sensor Readings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {liveData.map((s: any) => (
              <div key={s.sensorId} style={{
                padding: '0.75rem', borderRadius: 6,
                background: s.isAnomaly ? 'rgba(239,68,68,0.08)' : 'var(--color-surface-alt)',
                border: `1px solid ${s.isAnomaly ? '#fca5a5' : 'var(--color-border)'}`,
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>{s.type}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.isAnomaly ? '#ef4444' : 'var(--color-text)' }}>
                  {s.value} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>{s.unit}</span>
                </div>
                {s.isAnomaly && <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 2 }}>⚠ ANOMALY</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sensor History Chart */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Sensor History</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['1h', '6h', '24h', '7d'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '0.25rem 0.75rem', borderRadius: 4, border: '1px solid var(--color-border)',
                  background: timeRange === range ? 'var(--color-primary, #1a56db)' : 'var(--color-surface)',
                  color: timeRange === range ? '#fff' : 'var(--color-muted)',
                  cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>Loading chart...</div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="time" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              {Object.keys(SENSOR_COLORS).map(type => (
                chartData[0]?.[type] !== undefined && (
                  <Line key={type} type="monotone" dataKey={type} stroke={SENSOR_COLORS[type]} dot={false} strokeWidth={2} />
                )
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>No history data available</div>
        )}
      </div>

      {/* Machine Info */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Machine Info</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div><span style={{ color: 'var(--color-muted)' }}>Manufacturer:</span> {m.manufacturer}</div>
          <div><span style={{ color: 'var(--color-muted)' }}>Serial:</span> {m.serialNumber}</div>
          <div><span style={{ color: 'var(--color-muted)' }}>Firmware:</span> {m.firmwareVersion}</div>
          <div><span style={{ color: 'var(--color-muted)' }}>Install Date:</span> {m.installDate}</div>
          <div><span style={{ color: 'var(--color-muted)' }}>Next Maintenance:</span> {m.nextMaintenanceDate || 'N/A'}</div>
          <div><span style={{ color: 'var(--color-muted)' }}>Tags:</span> {m.tags?.join(', ')}</div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Recent Alerts</h3>
        {alertsData && alertsData.length > 0 ? (
          <div style={{ fontSize: '0.875rem' }}>
            {alertsData.slice(0, 5).map((alert: any) => (
              <div key={alert.id} style={{
                display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <div>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 8,
                    background: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#f59e0b' : '#3b82f6',
                  }} />
                  {alert.title}
                </div>
                <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>
                  {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-muted)' }}>No recent alerts</p>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{
    background: 'var(--color-surface)', borderRadius: 8, padding: '1rem',
    border: '1px solid var(--color-border)', textAlign: 'center',
  }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
  </div>
);

export default MachineDetailPage;
