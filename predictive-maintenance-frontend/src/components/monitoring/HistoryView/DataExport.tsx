import React from 'react';
import { downloadJson } from '../../../utils/helpers';
import type { SensorHistory } from '../../../types/sensor.types';

interface DataExportProps {
  data: SensorHistory[];
  filename?: string;
}

const DataExport: React.FC<DataExportProps> = ({ data, filename = 'sensor-history' }) => {
  const handleExport = () => downloadJson(data, `${filename}-${Date.now()}.json`);

  return (
    <button
      onClick={handleExport}
      style={{
        padding: '0.375rem 0.875rem',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        background: 'none',
        cursor: 'pointer',
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
      }}
    >
      ↓ Export JSON
    </button>
  );
};

export default DataExport;
