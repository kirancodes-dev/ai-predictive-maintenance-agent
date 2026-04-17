import React from 'react';
import { useBaseline } from '../../../hooks/useBaseline';
import { SENSOR_CONFIG, KNOWN_SENSOR_TYPES } from '../../monitoring/charts/chartConfig';

const MACHINE_IDS = ['CNC_01', 'CNC_02', 'PUMP_03', 'CONVEYOR_04'];

const MachineBaseline: React.FC<{ machineId: string }> = ({ machineId }) => {
  const { baseline, isLoading, isError, overallHealth } = useBaseline(machineId);

  const healthColor = overallHealth === null ? '#6b7280'
    : overallHealth >= 80 ? '#16a34a'
    : overallHealth >= 60 ? '#d97706' : '#ef4444';
  const healthBg = overallHealth === null ? '#f3f4f6'
    : overallHealth >= 80 ? '#f0fdf4'
    : overallHealth >= 60 ? '#fffbeb' : '#fee2e2';

  return (
    <div style={{
      border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Machine header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px',
        background: 'var(--color-background)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{machineId}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLoading && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Computing…</span>
          )}
          {isError && (
            <span style={{ fontSize: 11, color: '#ef4444' }}>Baseline unavailable</span>
          )}
          {overallHealth !== null && !isLoading && (
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '2px 10px',
              borderRadius: 12, background: healthBg, color: healthColor,
            }}>
              {overallHealth >= 80 ? '✓' : overallHealth >= 60 ? '⚠' : '✗'} Health {overallHealth}%
            </span>
          )}
          {baseline?.computedAt && !isLoading && (
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              Computed {new Date(baseline.computedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Per-sensor threshold rows */}
      {isLoading ? (
        <div style={{ padding: '16px', fontSize: 12, color: 'var(--color-text-muted)' }}>
          Analysing 7-day history…
        </div>
      ) : baseline ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--color-surface)' }}>
              {['Sensor', 'Mean (μ)', 'Warn Min', 'Warn Max', 'Crit Min', 'Crit Max', 'Trend'].map(h => (
                <th key={h} style={{
                  padding: '6px 12px', textAlign: 'left', fontWeight: 600,
                  color: 'var(--color-text-muted)', fontSize: 11,
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {KNOWN_SENSOR_TYPES.map((type) => {
              const s = baseline.sensors[type];
              const cfg = SENSOR_CONFIG[type];
              if (!s) return null;
              const trendBad = type === 'rpm' ? s.trend === 'decreasing' : s.trend === 'increasing';
              const trendColor = s.trend === 'stable' ? '#16a34a' : trendBad ? '#ef4444' : '#2563eb';
              const trendLabel = s.trend === 'stable' ? '● Stable'
                : s.trend === 'increasing' ? `↑ +${s.trendPct.toFixed(1)}%`
                : `↓ ${s.trendPct.toFixed(1)}%`;
              return (
                <tr key={type} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: cfg.color,
                        display: 'inline-block', flexShrink: 0,
                      }} />
                      <strong style={{ color: cfg.color }}>{cfg.label}</strong>
                      <span style={{ color: 'var(--color-text-muted)' }}>{cfg.unit}</span>
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.mean.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px', color: '#f59e0b' }}>{s.warningMin.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px', color: '#f59e0b' }}>{s.warningMax.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px', color: '#ef4444' }}>{s.criticalMin.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px', color: '#ef4444' }}>{s.criticalMax.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: trendColor,
                      background: trendColor + '18', borderRadius: 10, padding: '2px 8px',
                    }}>
                      {trendLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div style={{ padding: '16px', fontSize: 12, color: 'var(--color-text-muted)' }}>
          No baseline data — ensure the simulation server is running.
        </div>
      )}
    </div>
  );
};

const AlertConfig: React.FC = () => (
  <div>
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
        Auto-Computed Alert Thresholds
      </h3>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, marginBottom: 0 }}>
        Thresholds are computed automatically from each machine's 7-day sensor history using
        statistical analysis (μ ± 2σ warning, μ ± 3σ critical). No manual configuration required.
      </p>
    </div>
    {MACHINE_IDS.map((id) => (
      <MachineBaseline key={id} machineId={id} />
    ))}
  </div>
);

export default AlertConfig;
