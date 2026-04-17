import React from 'react';
import MaintenanceTable from './MaintenanceTable';
import { useQuery } from 'react-query';
import { maintenanceApi } from '../../../services/api/maintenanceApi';

const MaintenanceHistory: React.FC = () => {
  const { data, isLoading } = useQuery('maintenance', () =>
    maintenanceApi.getAll().then(r => r.data.items)
  );

  return (
    <div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Maintenance History</h3>
      {isLoading ? <p>Loading...</p> : <MaintenanceTable records={data ?? []} />}
    </div>
  );
};

export default MaintenanceHistory;
