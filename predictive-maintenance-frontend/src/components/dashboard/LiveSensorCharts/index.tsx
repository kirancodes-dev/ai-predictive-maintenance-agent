import React, { useMemo } from 'react';
import { useStreamData } from '../../../hooks/useStreamData';
import { SensorChartPanel } from '../../monitoring/charts/SensorChart';
import {
  KNOWN_SENSOR_TYPES, type KnownSensorType, type SensorChartPoint,
} from '../../monitoring/charts/chartConfig';
import type { SensorReadingDto } from '../../../services/api/streamApi';

/* ── Props (kept for backward compat with DashboardPage) ── */
interface Props {
  liveData: Record<string, SensorReadingDto[]>;
  machineIds: string[];
}

/* ── Per-machine stream panel ── */
const MachineStreamCharts: React.FC<{ machineId: string; label: string }> = ({ machineId, label }) => {
  const { readings, isConnected } = useStreamData(machineId);

  const chartDataByType = useMemo<Record<KnownSensorType, SensorChartPoint[]>>(() => {
    const map = {} as Record<KnownSensorType, SensorChartPoint[]>;
    for (const type of KNOWN_SENSOR_TYPES) {
      map[type] = readings
        .filter((r) => r.type === type)
        .map((r) => ({ timestamp: r.timestamp, value: r.value, isAnomaly: r.isAnomaly }));
    }
    return map;
  }, [readings]);

  const totalAnomalies = readings.filter((r) => r.isAnomaly).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Machine header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          width: 9, height: 9, borderRadius: '50%', display: 'inline-block',
          background: isConnected ? '#22c55e' : '#ef4444',
          boxShadow: isConnected ? '0 0 8px #22c55e80' : 'none',
        }} />
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          {label}
        </span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          {isConnected ? 'Streaming live' : 'Reconnecting…'} · {readings.length} readings
        </span>
        {totalAnomalies > 0 && (
          <span style={{
            background: '#fee2e2', color: '#ef4444', borderRadius: 12,
            padding: '2px 10px', fontSize: 12, fontWeight: 700,
          }}>
            ⚠ {totalAnomalies} anomal{totalAnomalies > 1 ? 'ies' : 'y'}
          </span>
        )}
      </div>

      {/* 2x2 sensor charts — exact same component as monitoring screen */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 16,
      }}>
        {KNOWN_SENSOR_TYPES.map((type) => (
          <SensorChartPanel
            key={type}
            type={type}
            data={chartDataByType[type]}
            mode="live"
            height={220}
            isLoading={false}
          />
        ))}
      </div>
    </div>
  );
};

const MACHINE_LABELS: Record<string, string> = {
  CNC_01: 'CNC Machine #1',
  CNC_02: 'CNC Machine #2',
  PUMP_03: 'Pump #3',
  CONVEYOR_04: 'Conveyor #4',
};

/* ── Main component ── */
const LiveSensorCharts: React.FC<Props> = ({ machineIds }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Section header */}
      <div>
        <h2 style={{
          margin: 0, fontSize: '1.1rem', fontWeight: 800,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <span>Real-Time Sensor Trends</span>
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
          Live WebSocket streaming · {machineIds.length} machines · same charts as monitoring
        </p>
      </div>

      {/* One chart section per machine */}
      {machineIds.map((mid) => (
        <MachineStreamCharts
          key={mid}
          machineId={mid}
          label={MACHINE_LABELS[mid] ?? mid}
        />
      ))}
    </div>
  );
};

export default LiveSensorCharts;
