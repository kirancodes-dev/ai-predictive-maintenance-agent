import React, { useMemo } from 'react';
import { useStreamData } from '../../../hooks/useStreamData';
import { useBaseline } from '../../../hooks/useBaseline';
import { SensorChartPanel, CombinedChartPanel } from '../charts';
import {
  KNOWN_SENSOR_TYPES,
  type KnownSensorType,
  type SensorChartPoint,
  type SensorThresholds,
  buildCombinedLiveData,
} from '../charts/chartConfig';
import SensorReadings from './SensorReadings';

interface LiveStreamProps {
  machineId: string;
  machineName?: string;
}

const LiveStream: React.FC<LiveStreamProps> = ({ machineId, machineName }) => {
  const { readings, isConnected, clearReadings } = useStreamData(machineId);
  const { baseline, isLoading: baselineLoading, overallHealth, computedAt } =
    useBaseline(machineId);

  /* Per-type chart data */
  const chartDataByType = useMemo<Record<KnownSensorType, SensorChartPoint[]>>(() => {
    const map = {} as Record<KnownSensorType, SensorChartPoint[]>;
    for (const type of KNOWN_SENSOR_TYPES) {
      map[type] = readings
        .filter((r) => r.type === type)
        .map((r) => ({ timestamp: r.timestamp, value: r.value, isAnomaly: r.isAnomaly }));
    }
    return map;
  }, [readings]);

  /* Thresholds derived from auto-computed baseline (not hardcoded) */
  const thresholdsByType = useMemo<Record<KnownSensorType, SensorThresholds | undefined>>(() => {
    const map = {} as Record<KnownSensorType, SensorThresholds | undefined>;
    for (const type of KNOWN_SENSOR_TYPES) {
      const bl = baseline?.sensors[type];
      map[type] = bl
        ? {
            warningMin:  bl.warningMin,
            warningMax:  bl.warningMax,
            criticalMin: bl.criticalMin,
            criticalMax: bl.criticalMax,
            mean:        bl.mean,
            trend:       bl.trend,
            trendPct:    bl.trendPct,
          }
        : undefined;
    }
    return map;
  }, [baseline]);

  const combinedData = useMemo(() => buildCombinedLiveData(readings), [readings]);
  const totalAnomalies = readings.filter((r) => r.isAnomaly).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Status + baseline summary bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', display: 'inline-block',
                         background: isConnected ? '#22c55e' : '#ef4444',
                         boxShadow: isConnected ? '0 0 8px #22c55e80' : 'none' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {isConnected ? 'Streaming live' : 'Disconnected'}
            {machineName ? ` — ${machineName}` : ''}
          </span>
          {totalAnomalies > 0 && (
            <span style={{ background: '#fee2e2', color: '#ef4444', borderRadius: 12,
                           padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
              ⚠ {totalAnomalies} anomal{totalAnomalies > 1 ? 'ies' : 'y'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Auto-baseline health indicator */}
          {overallHealth !== null && !baselineLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                          background: overallHealth >= 80 ? '#f0fdf4'
                                    : overallHealth >= 60 ? '#fffbeb' : '#fee2e2',
                          borderRadius: 10, padding: '4px 12px' }}>
              <span style={{ fontSize: 12, fontWeight: 600,
                             color: overallHealth >= 80 ? '#16a34a'
                                  : overallHealth >= 60 ? '#d97706' : '#ef4444' }}>
                {overallHealth >= 80 ? '✓' : overallHealth >= 60 ? '⚠' : '✗'} Health {overallHealth}%
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                auto-baseline
              </span>
            </div>
          )}
          {baselineLoading && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Computing baseline…
            </span>
          )}
          {computedAt && !baselineLoading && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Baseline: {new Date(computedAt).toLocaleTimeString()}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {readings.length} readings
          </span>
          <button onClick={clearReadings}
            style={{ padding: '4px 12px', fontSize: 12, border: '1px solid var(--color-border)',
                     borderRadius: 8, background: 'none', cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      </div>

      {/* Current value gauges */}
      <SensorReadings readings={readings} />

      {/* 2 × 2 individual sensor charts — thresholds from auto-computed baseline */}
      <div style={{ display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        {KNOWN_SENSOR_TYPES.map((type) => (
          <SensorChartPanel
            key={type}
            type={type}
            data={chartDataByType[type]}
            mode="live"
            height={220}
            thresholds={thresholdsByType[type]}
            isLoading={baselineLoading}
          />
        ))}
      </div>

      {/* Combined overview */}
      <CombinedChartPanel data={combinedData} mode="live" height={260} />
    </div>
  );
};

export default LiveStream;
