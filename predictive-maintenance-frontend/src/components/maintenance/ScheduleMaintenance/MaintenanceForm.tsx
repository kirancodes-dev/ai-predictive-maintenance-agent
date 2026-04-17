import React from 'react';
import { useForm } from 'react-hook-form';
import type { MaintenanceScheduleRequest } from '../../../types/maintenance.types';

interface MaintenanceFormProps {
  machineId: string;
  onSubmit: (data: MaintenanceScheduleRequest) => void;
  isLoading?: boolean;
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ machineId, onSubmit, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<MaintenanceScheduleRequest>({
    defaultValues: { machineId },
  });

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    background: 'var(--color-bg)',
    color: 'var(--color-text-primary)',
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input type="hidden" {...register('machineId')} />

      <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
        Title *
        <input {...register('title', { required: 'Title is required' })} style={{ ...inputStyle, marginTop: 4 }} />
        {errors.title && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>{errors.title.message}</span>}
      </label>

      <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
        Type *
        <select {...register('type', { required: true })} style={{ ...inputStyle, marginTop: 4 }}>
          <option value="preventive">Preventive</option>
          <option value="corrective">Corrective</option>
          <option value="predictive">Predictive</option>
          <option value="inspection">Inspection</option>
        </select>
      </label>

      <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
        Scheduled Date *
        <input type="datetime-local" {...register('scheduledDate', { required: 'Date is required' })} style={{ ...inputStyle, marginTop: 4 }} />
        {errors.scheduledDate && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>{errors.scheduledDate.message}</span>}
      </label>

      <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
        Description
        <textarea {...register('description')} rows={3} style={{ ...inputStyle, marginTop: 4, resize: 'vertical' }} />
      </label>

      <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
        Estimated Duration (minutes)
        <input type="number" min={1} {...register('estimatedDuration', { valueAsNumber: true })} style={{ ...inputStyle, marginTop: 4 }} />
      </label>

      <button
        type="submit"
        disabled={isLoading}
        style={{
          padding: '0.625rem',
          background: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? 'Scheduling...' : 'Schedule Maintenance'}
      </button>
    </form>
  );
};

export default MaintenanceForm;
