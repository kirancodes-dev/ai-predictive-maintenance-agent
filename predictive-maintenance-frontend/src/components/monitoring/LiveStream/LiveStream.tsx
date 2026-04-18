import React, { useMemo, useState } from 'react';
import { useStreamData } from '../../../hooks/useStreamData';
import { useBaseline } from '../../../hooks/useBaseline';
import ThresholdOverrideModal from '../ThresholdOverrideModal';
import { SensorChartPanel } from '../charts/SensorChart';
import { CombinedChartPanel } from '../charts/CombinedChart';
import {
  KNOWN_SENSOR_TYPES, type KnownSensorType, type SensorChartPoint,
  type SensorThresholds, buildCombinedLiveData,
} from '../charts/chartConfig';
import SensorReadings from './SensorReadings';

interface LiveStreamProps {
  machineId: string;
  machineName?: string;
}

const LiveStream: React.FC<LiveStreamProps> = ({ machineId, machineName }) => {
  const [showOverride, setShowOverride] = useState(false);
  const { readings, isConnected, clearReadings } = useStreamData(machineId);
  const { baseline, isLoading: baselineLoading, overallHealth, computedAt } = useBaseline(machineId);

  const chartDataByType = useMemo<Record<KnownSensorType, SensorChartPoint[]>>(() => {
    const map = {} as Record<KnownSensorType, SensorChartPoint[]>;
    for (const type of KNOWN_SENSOR_TYPES) {
      map[type] = readings
        .filter((r) => r.type === type)
        .map((r) => ({ timestamp: r.timestamp, value: r.value, isAnomaly: r.isAnomaly }));
    }
    return map;
  }, [readings]);

  const thresholdsByType = useMemo<Record<KnownSensorType, SensorThresholds | undefined>>(() => {
    const map = {} as Record<KnownSensorType, SensorThresholds | undefined>;
    for (const type of KNOWN_SENSOR_TYPES) {
      const bl = baseline?.sensors[type];
      map[type] = bl
        ? { warningMin: bl.warningMin, warningMax: bl.warningMax,
            criticalMin: bl.criticalMin, criticalMax: bl.criticalMax,
            mean: bl.mean, trend: bl.trend, trendPct: bl.trendPct }
        : undefined;
    }
    return map;
  }, [baseline]);

  const combinedData = useMemo(() => buildCombinedLiveData(readings), [readings]);
  const totalAnomalies = readings.filter((r) => r.isAnomaly).length;

  const healthColor = overallHealth === null ? '#6b7280'
    : overallHealth >= 80 ? '#16a34a' : overallHealth >= 60 ? '#d97706' : '#ef4444';
  const healthBg = overallHealth === null ? 'var(--color-surface-alt)'
    : overallHealth >= 80 ? 'rgba(34,197,94,0.1)' : overallHealth >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 9, height: 9, borderRadius: '50%', display: 'inline-block',
            background: isConnected ? '#22c55e' : '#ef4444',
            boxShadow: isConnected ? '0 0 8px #22c55e80' : 'none',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {isConnected ? 'Streaming live' : 'Reconnecting…'}
            {machineName ? ` — ${machineName}` : ''}
          </span>
          {totalAnomalies > 0 && (
            <span style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: 12,
                           padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
              ⚠ {totalAnomalies} anomal{totalAnomalies > 1 ? 'ies' : 'y'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {overallHealth !== null && !baselineLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                          background: healthBg, borderRadius: 10, padding: '4px 12px' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: healthColor }}>
                {overallHealth >= 80 ? '✓' : overallHealth >= 60 ? '⚠' : '✗'} Health {overallHealth}%
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>auto-baseline</span>
            </div>
          )}
          {baselineLoading && (
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Computing baseline…</span>
          )}
          {computedAt && !baselineLoading && (
            <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
              Baseline: {new Date(computedAt).toLocaleTimeString()}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{readings.length} readings</span>
          <button onClick={() => setShowOverride(true)} style={{
            padding: '4px 12px', fontSize: 12, border: '1px solid var(--color-border)',
            borderRadius: 8, background: 'none', cursor: 'pointer', fontWeight: 600,
            color: 'var(--color-text)',
          }}>
            ⚙ Thresholds
          </button>
          <button onClick={clearReadings} style={{
            padding: '4px 12px', fontSize: 12, border: '1px solid var(--color-border)',
            borderRadius: 8, background: 'none', cursor: 'pointer',
            color: 'var(--color-text)',
          }}>
            Clear
          </button>
        </div>
      </div>

      {showOverride && (
        <ThresholdOverrideModal
          machineId={machineId}
          machineName={machineName ?? machineId}
          baseline={baseline?.sensors}
          onClose={() => setShowOverride(false)}
          onSaved={() => setShowOverride(false)}
        />
      )}

      {/* Latest sensor value cards */}
      <SensorReadings readings={readings} />

      {/* 2 × 2 sensor charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
        {KNOWN_SENSOR_TYPES.map((type) => (
          <SensorChartPanel
            key={type} type={type} data={chartDataByType[type]}
            mode="live" height={300} thresholds={thresholdsByType[type]}
            isLoading={baselineLoading}
          />
        ))}
      </div>

      {/* Combined sensor overview — passes real thresholds so per-sensor lines land correctly */}
      <CombinedChartPanel
        data={combinedData} mode="live" height={420}
        isLoading={baselineLoading}
        thresholdsByType={thresholdsByType}
      />

      {/* Threshold legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11,
                    color: 'var(--color-muted)', paddingLeft: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 18, height: 2, background: '#f59e0b',
                         borderTop: '2px dashed #f59e0b' }} />
          Warning threshold
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 18, height: 2, background: '#ef4444',
                         borderTop: '2px dashed #ef4444' }} />
          Critical threshold
        </span>
      </div>
    </div>
  );
};

export default LiveStream;
