import { RiskLevel } from '../types/machine.types';
import { RISK_LEVELS } from './constants';

export const getRiskLevel = (score: number): RiskLevel => {
  if (score <= RISK_LEVELS.LOW.max) return 'low';
  if (score <= RISK_LEVELS.MEDIUM.max) return 'medium';
  if (score <= RISK_LEVELS.HIGH.max) return 'high';
  return 'critical';
};

export const getRiskColor = (score: number): string => {
  const level = getRiskLevel(score);
  return RISK_LEVELS[level.toUpperCase() as keyof typeof RISK_LEVELS].color;
};

export const classNames = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce(
    (acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
};

export const downloadJson = (data: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
