export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  machineId: string;
  machineName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  timestamp: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
  sensorId?: string;
  value?: number;
}

export interface AlertListResponse {
  items: Alert[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AlertSummary {
  total: number;
  active: number;
  critical: number;
  acknowledged: number;
  resolved: number;
  severityCounts: Record<string, number>;
  timestamp: string;
}

export interface CreateAlertPayload {
  machineId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  sensorId?: string;
  value?: number;
}
