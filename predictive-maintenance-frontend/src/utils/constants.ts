export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
export const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8000/auth';

export const RISK_LEVELS = {
  LOW: { label: 'Low', min: 0, max: 25, color: '#22c55e' },
  MEDIUM: { label: 'Medium', min: 26, max: 50, color: '#f59e0b' },
  HIGH: { label: 'High', min: 51, max: 75, color: '#f97316' },
  CRITICAL: { label: 'Critical', min: 76, max: 100, color: '#ef4444' },
} as const;

export const SEVERITY_COLORS = {
  info: '#3b82f6',
  warning: '#f59e0b',
  error: '#f97316',
  critical: '#ef4444',
} as const;

export const STATUS_COLORS = {
  online: '#22c55e',
  offline: '#6b7280',
  warning: '#f59e0b',
  critical: '#ef4444',
  maintenance: '#3b82f6',
} as const;

export const WEBSOCKET_RECONNECT_DELAY = 3000;
export const WEBSOCKET_MAX_RETRIES = 5;

export const DEFAULT_PAGE_SIZE = 20;
export const CHART_REFRESH_INTERVAL = 5000; // ms
export const ALERT_POLL_INTERVAL = 10000; // ms
