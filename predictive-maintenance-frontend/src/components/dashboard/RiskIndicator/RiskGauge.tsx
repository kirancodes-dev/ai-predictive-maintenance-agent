import React from 'react';
import { getRiskColor } from '../../../utils/helpers';

interface RiskGaugeProps {
  score: number;
  size?: number;
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ score, size = 120 }) => {
  const color = getRiskColor(score);
  const radius = (size / 2) - 10;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
      {/* Background arc */}
      <path
        d={`M 10,${size / 2} A ${radius},${radius} 0 0,1 ${size - 10},${size / 2}`}
        fill="none"
        stroke="var(--color-bg-tertiary)"
        strokeWidth={10}
        strokeLinecap="round"
      />
      {/* Score arc */}
      <path
        d={`M 10,${size / 2} A ${radius},${radius} 0 0,1 ${size - 10},${size / 2}`}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fontSize={size / 5}
        fontWeight={700}
        fill={color}
      >
        {score}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 16}
        textAnchor="middle"
        fontSize={size / 10}
        fill="var(--color-text-secondary)"
      >
        / 100
      </text>
    </svg>
  );
};

export default RiskGauge;
