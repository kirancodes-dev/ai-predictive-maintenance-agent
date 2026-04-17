import React from 'react';
import MaintenanceForm from './MaintenanceForm';
import MaintenanceCalendar from './MaintenanceCalendar';
import { useMutation, useQueryClient } from 'react-query';
import { maintenanceApi } from '../../../services/api/maintenanceApi';
import type { MaintenanceRecord, MaintenanceScheduleRequest } from '../../../types/maintenance.types';

interface ScheduleMaintenanceProps {
  machineId: string;
  existingRecords?: MaintenanceRecord[];
}

const ScheduleMaintenance: React.FC<ScheduleMaintenanceProps> = ({
  machineId,
  existingRecords = [],
}) => {
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation(
    (data: MaintenanceScheduleRequest) => maintenanceApi.create(data as unknown as Record<string, unknown>),
    { onSuccess: () => queryClient.invalidateQueries(['maintenance']) },
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Schedule Maintenance
        </h3>
        <MaintenanceForm machineId={machineId} onSubmit={data => mutate(data)} isLoading={isLoading} />
      </div>
      <MaintenanceCalendar records={existingRecords} />
    </div>
  );
};

export default ScheduleMaintenance;
