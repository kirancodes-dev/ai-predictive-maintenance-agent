import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (dateStr: string, pattern = 'MMM dd, yyyy'): string => {
  return format(parseISO(dateStr), pattern);
};

export const formatDateTime = (dateStr: string): string => {
  return format(parseISO(dateStr), 'MMM dd, yyyy HH:mm');
};

export const formatRelativeTime = (dateStr: string): string => {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
};

export const formatNumber = (value: number, decimals = 2): string => {
  return value.toFixed(decimals);
};

export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

export const formatRiskScore = (score: number): string => {
  return `${Math.round(score)}/100`;
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};
