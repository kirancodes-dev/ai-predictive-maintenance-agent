import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { SensorDataPoint } from '../../../types/sensor.types';
import { formatDate } from '../../../utils/formatters';

interface LiveStreamChartProps {
  data: SensorDataPoint[];
  sensorName: string;
  unit: string;
  color?: string;
}

const LiveStreamChart: React.FC<LiveStreamChartProps> = ({
  data,
  sensorName,
  unit,
  color = '#3b82f6',
}) => {
  const formatted = data.map(d => ({
    ...d,
    time: formatDate(d.timestamp, 'HH:mm:ss'),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit={` ${unit}`} />
        <Tooltip formatter={(v: number) => [`${v} ${unit}`, sensorName]} />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          name={sensorName}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default LiveStreamChart;
