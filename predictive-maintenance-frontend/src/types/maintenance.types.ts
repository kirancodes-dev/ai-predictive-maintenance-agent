export type MaintenanceType = 'preventive' | 'corrective' | 'predictive' | 'inspection';
export type MaintenanceStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type Urgency = 'low' | 'medium' | 'high' | 'critical' | 'imminent';

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
  estimatedDuration: number;
  actualDuration?: number;
  cost?: number;
  notes?: string;
  partsReplaced?: string[];
  createdAt: string;
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

/** Legacy prediction shape (from /maintenance/predictions) */
export interface FailurePrediction {
  machineId: string;
  machineName: string;
  predictedFailureDate: string;
  confidence: number;
  failureType: string;
  recommendation: string;
  urgency: Urgency;
  estimatedHoursRemaining?: number;
}

/** Rich prediction from the new /predictions endpoints */
export interface RichPrediction {
  id?: string;
  machineId: string;
  machineName: string;
  estimatedHoursRemaining: number;
  predictedFailureAt: string;
  confidence: number;
  failureType: string;
  urgency: Urgency;
  recommendation: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedAt?: string;
  workOrderId?: string;
  notificationsSent?: {
    '72h': boolean;
    '48h': boolean;
    '24h': boolean;
    '12h': boolean;
    '6h': boolean;
    '1h': boolean;
  };
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialty: string;
  skills: string[];
  shiftStartHour: number;
  shiftEndHour: number;
  isAvailable: boolean;
  isOnShift: boolean;
  currentAssignmentMachineId?: string;
  currentAssignmentMachineName?: string;
  assignmentStartedAt?: string;
  estimatedFreeAt?: string;
  isActive: boolean;
}
