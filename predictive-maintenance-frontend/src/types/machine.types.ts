export type MachineStatus = 'online' | 'offline' | 'warning' | 'critical' | 'maintenance';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Machine {
  id: string;
  name: string;
  model: string;
  location: string;
  status: MachineStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  lastSeen: string;
  installDate: string;
  nextMaintenanceDate?: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface MachineDetail extends Machine {
  description: string;
  manufacturer: string;
  serialNumber: string;
  firmwareVersion: string;
  sensors: string[];
  maintenanceHistory: string[];
}

export interface MachineListResponse {
  machines: Machine[];
  total: number;
  page: number;
  pageSize: number;
}
