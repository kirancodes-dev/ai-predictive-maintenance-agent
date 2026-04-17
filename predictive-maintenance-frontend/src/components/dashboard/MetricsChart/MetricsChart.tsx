import React from 'react';
import LiveStreamChart from './LiveStreamChart';
import HistoricalChart from './HistoricalChart';
import type { SensorDataPoint } from '../../../types/sensor.types';

interface MetricsChartProps {
  data: SensorDataPoint[];
  sensorName: string;
  unit: string;
  mode?: 'live' | 'historical';
  color?: string;
}

const MetricsChart: React.FC<MetricsChartProps> = ({ mode = 'live', ...props }) => {
  return mode === 'live' ? <LiveStreamChart {...props} /> : <HistoricalChart {...props} />;
};

export default MetricsChart;
