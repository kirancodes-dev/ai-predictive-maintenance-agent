import React from 'react';
import RiskGauge from './RiskGauge';
import { getRiskLevel, getRiskColor } from '../../../utils/helpers';

interface RiskIndicatorProps {
  score: number;
  machineName?: string;
}

const RiskIndicator: React.FC<RiskIndicatorProps> = ({ score, machineName }) => {
  const level = getRiskLevel(score);
  const color = getRiskColor(score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <RiskGauge score={score} />
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color,
        }}
      >
        {level} risk
      </span>
      {machineName && (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          {machineName}
        </span>
      )}
    </div>
  );
};

export default RiskIndicator;
