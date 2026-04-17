export const ENDPOINTS = {
  // Machines
  MACHINES: '/machines',
  MACHINE_DETAIL: (id: string) => `/machines/${id}`,
  MACHINE_SENSORS: (id: string) => `/machines/${id}/sensors`,
  MACHINE_RISK: (id: string) => `/machines/${id}/risk`,

  // Streaming
  STREAM_LIVE: (machineId: string) => `/stream/${machineId}/live`,
  STREAM_HISTORY: (machineId: string) => `/stream/${machineId}/history`,

  // Alerts
  ALERTS: '/alerts',
  ALERT_DETAIL: (id: string) => `/alerts/${id}`,
  ALERT_ACKNOWLEDGE: (id: string) => `/alerts/${id}/acknowledge`,
  ALERT_RESOLVE: (id: string) => `/alerts/${id}/resolve`,

  // Maintenance
  MAINTENANCE: '/maintenance',
  MAINTENANCE_DETAIL: (id: string) => `/maintenance/${id}`,
  MAINTENANCE_PREDICTIONS: '/maintenance/predictions',

  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_ME: '/auth/me',
} as const;
