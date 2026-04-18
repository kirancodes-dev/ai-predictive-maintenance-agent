import React from 'react';
import MachineCard from './MachineCard';
import type { Machine } from '../../../types/machine.types';
import { DashboardCardSkeleton } from '../../common/Skeleton';
import './MachineGrid.css';

interface MachineGridProps {
  machines: Machine[];
  isLoading?: boolean;
}

const MachineGrid: React.FC<MachineGridProps> = ({ machines, isLoading }) => {
  if (isLoading) {
    return (
      <div className="machine-grid">
        {[0, 1, 2, 3].map(i => <DashboardCardSkeleton key={i} />)}
      </div>
    );
  }

  if (machines.length === 0) {
    return <div className="machine-grid machine-grid--empty">No machines found.</div>;
  }

  return (
    <div className="machine-grid">
      {machines.map(machine => (
        <MachineCard key={machine.id} machine={machine} />
      ))}
    </div>
  );
};

export default MachineGrid;
