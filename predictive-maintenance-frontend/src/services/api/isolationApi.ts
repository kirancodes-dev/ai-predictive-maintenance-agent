import { apiClient } from './apiClient';

export interface IsolationRecord {
  id: string;
  machineId: string;
  machineName: string;
  isIsolated: boolean;
  isolationType: 'auto' | 'manual';
  reason: string;
  riskScoreAtIsolation: number;
  protectedMachineIds: string[];
  protectedMachineNames: string[];
  triggeredBy: string;
  isolatedAt: string | null;
  releasedAt: string | null;
  releasedBy: string | null;
}

export interface MachineTopologyNode {
  name: string;
  zone: string;
  position: [number, number];
  downstream: string[];
  upstream: string[];
  line: string;
}

export interface IsolationStatus {
  machineId: string;
  machineName: string;
  zone: string;
  position: [number, number];
  line: string;
  downstream: string[];
  upstream: string[];
  isIsolated: boolean;
  isolation: IsolationRecord | null;
}

export interface CascadeImpact {
  sourceId: string;
  sourceName: string;
  affectedMachines: Array<{
    machineId: string;
    machineName: string;
    zone: string;
    currentRiskScore: number;
    currentStatus: string;
    impactLevel: 'direct' | 'indirect';
  }>;
  totalAtRisk: number;
  recommendation: string;
}

export const isolationApi = {
  getTopology: () =>
    apiClient.get<{ data: Record<string, MachineTopologyNode> }>('/isolation/topology'),

  getStatus: () =>
    apiClient.get<{ data: Record<string, IsolationStatus> }>('/isolation/status'),

  getCascadeImpact: (machineId: string) =>
    apiClient.get<{ data: CascadeImpact }>(`/isolation/cascade-impact/${machineId}`),

  isolate: (machineId: string, reason: string) =>
    apiClient.post<{ data: IsolationRecord; message: string }>('/isolation/isolate', {
      machineId,
      reason,
    }),

  release: (machineId: string) =>
    apiClient.post<{ data: IsolationRecord; message: string }>('/isolation/release', {
      machineId,
    }),

  getHistory: (machineId?: string, limit?: number) =>
    apiClient.get<{ data: IsolationRecord[] }>('/isolation/history', {
      params: { machineId, limit },
    }),
};
