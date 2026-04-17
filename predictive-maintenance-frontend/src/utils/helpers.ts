export function getRiskColor(score: number): string {
  if (score >= 75) return '#ef4444'; // critical
  if (score >= 50) return '#f97316'; // high
  if (score >= 25) return '#f59e0b'; // medium
  return '#22c55e';                  // low
}

export function getRiskLevel(score: number): string {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
