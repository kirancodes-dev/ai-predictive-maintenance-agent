// ── Machine types ───────────────────────────────────────────────────────────
export type MachineStatus = 'online' | 'warning' | 'critical' | 'offline' | 'maintenance';
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
  description: string;
  manufacturer: string;
  serialNumber: string;
  firmwareVersion: string;
  createdAt: string;
}

export interface MachineListResponse {
  items: Machine[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
