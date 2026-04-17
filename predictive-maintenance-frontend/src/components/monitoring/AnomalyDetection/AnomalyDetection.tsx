import React from 'react';
import AnomalyTimeline from './AnomalyTimeline';
import { useStreamData } from '../../../hooks/useStreamData';

interface AnomalyDetectionProps {
  machineId: string;
}

const AnomalyDetection: React.FC<AnomalyDetectionProps> = ({ machineId }) => {
  const { readings } = useStreamData(machineId);

  return (
    <div>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Anomaly Detection</h3>
      <AnomalyTimeline readings={readings} />
    </div>
  );
};

export default AnomalyDetection;
