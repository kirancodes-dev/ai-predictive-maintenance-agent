import React, { useMemo, useState } from 'react';
import { useStreamData } from '../../../hooks/useStreamData';
import { SensorChartPanel } from '../../monitoring/charts/SensorChart';
import {
  SENSOR_CONFIG, KNOWN_SENSOR_TYPES, type KnownSensorType, type SensorChartPoint,
} from '../../monitoring/charts/chartConfig';
import type { SensorReadingDto } from '../../../services/api/streamApi';

interface Props {
  liveData: Record<string, SensorReadingDto[]>;
  machineIds: string[];
}

const MACHINE_LABELS: Record<string, string> = {
  CNC_01: 'CNC Machine #1',
  CNC_02: 'CNC Machine #2',
  PUMP_03: 'Pump #3',
  CONVEYOR_04: 'Conveyor #4',
};

const MACHINE_ICONS: Record<string, string> = {
  CNC_01: 'C1',
  CNC_02: 'C2',
  PUMP_03: 'P3',
  CONVEYOR_04: 'V4',
};

/* ── Per-machine card with expand/collapse ── */
const MachineCard: React.FC<{ machineId: string }> = ({ machineId }) => {
  const [expanded, setExpanded] = useState(true);
  const { readings, isConnected } = useStreamData(machineId);

  const label = MACHINE_LABELS[machineId] ?? machineId;
  const icon = MACHINE_ICONS[machineId] ?? 'M';

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

  // Latest value per sensor type
  const latestValues = useMemo(() => {
    const result: Record<string, { value: number; unit: string } | null> = {};
    for (const type of KNOWN_SENSOR_TYPES) {
      const typeReadings = readings.filter((r) => r.type === type);
      if (typeReadings.length) {
        const last = typeReadings[typeReadings.length - 1];
        result[type] = { value: last.value, unit: SENSOR_CONFIG[type].unit };
      } else {
        result[type] = null;
      }
    }
    return result;
  }, [readings]);

  return (
    <div style={{
      background: 'var(--color-surface, #fff)',
      borderRadius: 12,
      border: `1px solid ${totalAnomalies > 0 ? '#fca5a5' : 'var(--color-border, #e2e8f0)'}`,
      boxShadow: totalAnomalies > 0
        ? '0 0 0 2px rgba(239,68,68,0.1)'
        : '0 1px 4px var(--color-card-shadow, rgba(0,0,0,0.06))',
      overflow: 'hidden',
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>
      {/* ── Compact card header ── */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        {/* Left: machine info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{icon}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                background: isConnected ? '#22c55e' : '#ef4444',
                boxShadow: isConnected ? '0 0 6px #22c55e80' : 'none',
              }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>{label}</span>
              {totalAnomalies > 0 && (
                <span style={{
                  background: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: 12,
                  padding: '1px 8px', fontSize: 11, fontWeight: 700,
                }}>
                  ⚠ {totalAnomalies}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
              {isConnected ? 'Live' : 'Offline'} · {readings.length} readings
            </span>
          </div>
        </div>

        {/* Center: quick sensor values */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {KNOWN_SENSOR_TYPES.map((type) => {
            const cfg = SENSOR_CONFIG[type];
            const latest = latestValues[type];
            return (
              <div key={type} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minWidth: 60,
              }}>
                <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                <span style={{
                  fontSize: 15, fontWeight: 700, color: cfg.color,
                  fontFamily: 'monospace', lineHeight: 1.2,
                }}>
                  {latest ? latest.value.toFixed(1) : '—'}
                </span>
                <span style={{ fontSize: 9, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right: View Charts button */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid var(--color-border, #e2e8f0)',
            borderRadius: 8,
            background: expanded ? '#3b82f6' : 'var(--color-surface, #fff)',
            color: expanded ? '#fff' : '#3b82f6',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {expanded ? 'Hide Charts' : 'View Charts'}
        </button>
      </div>

      {/* ── Expandable charts section ── */}
      {expanded && (
        <div style={{
          padding: '0 20px 24px',
          borderTop: '1px solid var(--color-border, #e2e8f0)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(560px, 1fr))',
            gap: 24,
            marginTop: 20,
          }}>
            {KNOWN_SENSOR_TYPES.map((type) => (
              <SensorChartPanel
                key={type}
                type={type}
                data={chartDataByType[type]}
                mode="live"
                height={320}
                isLoading={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Main component ── */
const LiveSensorCharts: React.FC<Props> = ({ machineIds }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{
          margin: 0, fontSize: '1.1rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>Real-Time Sensor Trends</span>
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-muted, #94a3b8)' }}>
          Live sensor readings · spikes highlighted in red · auto-refreshes every 5s
        </p>
      </div>

      {machineIds.map((mid) => (
        <MachineCard key={mid} machineId={mid} />
      ))}
    </div>
  );
};

export default LiveSensorCharts;
