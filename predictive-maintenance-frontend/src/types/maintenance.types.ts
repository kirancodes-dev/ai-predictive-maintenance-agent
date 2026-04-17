export type MaintenanceType = 'preventive' | 'corrective' | 'predictive' | 'inspection';
export type MaintenanceStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface MaintenanceRecord {
  id: string;
  machineId: string;
  machineName: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  title: string;
  description: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  estimatedDuration: number; // minutes
  actualDuration?: number;
  cost?: number;
  notes?: string;
  partsReplaced?: string[];
}

export interface MaintenanceScheduleRequest {
  machineId: string;
  type: MaintenanceType;
  title: string;
  description: string;
  scheduledDate: string;
  assignedTo?: string;
  estimatedDuration: number;
}

export interface FailurePrediction {
  machineId: string;
  machineName: string;
  predictedFailureDate: string;
  confidence: number;
  failureType: string;
  recommendation: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}
