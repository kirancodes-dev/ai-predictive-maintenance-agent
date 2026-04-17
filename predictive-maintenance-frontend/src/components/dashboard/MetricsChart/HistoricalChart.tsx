import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { SensorDataPoint } from '../../../types/sensor.types';
import { formatDate } from '../../../utils/formatters';

interface HistoricalChartProps {
  data: SensorDataPoint[];
  sensorName: string;
  unit: string;
  color?: string;
}

const HistoricalChart: React.FC<HistoricalChartProps> = ({
  data,
  sensorName,
  unit,
  color = '#8b5cf6',
}) => {
  const formatted = data.map(d => ({
    ...d,
    date: formatDate(d.timestamp, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit={` ${unit}`} />
        <Tooltip formatter={(v: number) => [`${v} ${unit}`, sensorName]} />
        <Legend />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#colorGradient)"
          name={sensorName}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default HistoricalChart;
