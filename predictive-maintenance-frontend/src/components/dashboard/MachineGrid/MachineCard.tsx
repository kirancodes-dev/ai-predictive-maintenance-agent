import React from 'react';
import { Link } from 'react-router-dom';
import type { Machine } from '../../../types/machine.types';
import { STATUS_COLORS } from '../../../utils/constants';
import { getRiskColor } from '../../../utils/helpers';

interface MachineCardProps {
  machine: Machine;
}

const MachineCard: React.FC<MachineCardProps> = ({ machine }) => {
  const statusColor = STATUS_COLORS[machine.status];
  const riskColor = getRiskColor(machine.riskScore);

  return (
    <Link to={`/machines/${machine.id}`} style={{ textDecoration: 'none' }}>
      <div className="machine-card">
        <div className="machine-card__header">
          <span className="machine-card__name">{machine.name}</span>
          <span
            className="machine-card__status"
            style={{ background: `${statusColor}22`, color: statusColor }}
          >
            {machine.status}
          </span>
        </div>
        <div className="machine-card__location">{machine.location}</div>
        <div className="machine-card__risk">
          <span className="machine-card__risk-label">Risk Score</span>
          <span className="machine-card__risk-value" style={{ color: riskColor }}>
            {machine.riskScore}/100
          </span>
        </div>
        <div className="machine-card__risk-bar">
          <div
            className="machine-card__risk-bar-fill"
            style={{ width: `${machine.riskScore}%`, background: riskColor }}
          />
        </div>
      </div>
    </Link>
  );
};

export default MachineCard;
