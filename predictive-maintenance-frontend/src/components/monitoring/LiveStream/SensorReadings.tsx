import React from 'react';
import type { SensorReading } from '../../../types/sensor.types';
import { formatNumber } from '../../../utils/formatters';

interface SensorReadingsProps {
  readings: SensorReading[];
}

const SensorReadings: React.FC<SensorReadingsProps> = ({ readings }) => {
  const latest = readings.reduce<Record<string, SensorReading>>((acc, r) => {
    acc[r.sensorId] = r;
    return acc;
  }, {});

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
      {Object.values(latest).map(reading => (
        <div
          key={reading.sensorId}
          style={{
            background: reading.isAnomaly ? '#fee2e2' : 'var(--color-bg-secondary)',
            border: `1px solid ${reading.isAnomaly ? '#ef4444' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            {reading.type.toUpperCase()}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {formatNumber(reading.value)} {reading.unit}
          </div>
          {reading.isAnomaly && (
            <div style={{ fontSize: '0.6875rem', color: '#ef4444', fontWeight: 600, marginTop: 2 }}>
              ⚠ Anomaly detected
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SensorReadings;
