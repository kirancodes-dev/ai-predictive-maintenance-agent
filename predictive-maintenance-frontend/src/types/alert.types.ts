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

export interface AlertFilter {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  machineId?: string;
  from?: string;
  to?: string;
}
