import React from 'react';
import type { SensorReading } from '../../../types/sensor.types';
import { formatDateTime } from '../../../utils/formatters';
import { SEVERITY_COLORS } from '../../../utils/constants';

interface AnomalyTimelineProps {
  readings: SensorReading[];
}

const AnomalyTimeline: React.FC<AnomalyTimelineProps> = ({ readings }) => {
  const anomalies = readings.filter(r => r.isAnomaly);

  if (anomalies.length === 0) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>No anomalies detected.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {anomalies.map((a, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            borderLeft: `4px solid ${SEVERITY_COLORS.error}`,
          }}
        >
          <div style={{ fontSize: '1.25rem' }}>⚠️</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              {a.type} anomaly — {a.value} {a.unit}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Sensor {a.sensorId} · {formatDateTime(a.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnomalyTimeline;
