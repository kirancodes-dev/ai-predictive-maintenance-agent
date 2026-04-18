import { useState, useEffect, useRef } from 'react';

const SIM_URL = 'http://localhost:3000';
const MACHINES = ['CNC_01', 'CNC_02', 'PUMP_03', 'CONVEYOR_04'] as const;
const WINDOW_SIZE = 120;
const SCORE_HISTORY_MAX = 120;
const SENSOR_FIELDS = ['temperature_C', 'vibration_mm_s', 'rpm', 'current_A'] as const;

export interface SensorReading {
  machine_id: string;
  timestamp: string;
  temperature_C: number;
  vibration_mm_s: number;
  rpm: number;
  current_A: number;
  status: string;
}

export interface MachineSSEState {
  latest: SensorReading | null;
  history: SensorReading[];
  anomalyScore: number;
  zscores: Record<string, number>;
  isAnomaly: boolean;
  readingCount: number;
  anomalyCount: number;
  connected: boolean;
  healthScore: number;
}

export interface ScorePoint {
  time: string;
  timestamp: number;
  CNC_01: number;
  CNC_02: number;
  PUMP_03: number;
  CONVEYOR_04: number;
}

export interface AgentAlert {
  id?: number;
  machine_id: string;
  reason: string;
  reading?: Record<string, number>;
  severity?: string;
  source?: string;
  timestamp?: string;
}

export interface AgentMaintenance {
  id?: number;
  machine_id: string;
  proposed_slot?: string;
  reason?: string;
  timestamp?: string;
}

/* ── Z-Score anomaly detector (mirrors IPMA agent logic) ────────── */
function computeZScores(history: SensorReading[], current: SensorReading) {
  const zscores: Record<string, number> = {};
  if (history.length < 10) return { zscores: {}, score: 0, isAnomaly: false };

  let maxZ = 0;
  let sumZ = 0;

  for (const field of SENSOR_FIELDS) {
    const values = history.map(r => r[field]);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    const z = std > 0.001 ? Math.abs((current[field] - mean) / std) : 0;
    zscores[field] = Math.round(z * 100) / 100;
    maxZ = Math.max(maxZ, z);
    sumZ += z;
  }

  const avgZ = sumZ / SENSOR_FIELDS.length;
  const score = Math.min(1, Math.max(0, avgZ / 5));
  return { zscores, score: Math.round(score * 1000) / 1000, isAnomaly: maxZ > 3.0 };
}

function createInitialState(): Record<string, MachineSSEState> {
  const init: Record<string, MachineSSEState> = {};
  for (const id of MACHINES) {
    init[id] = {
      latest: null, history: [], anomalyScore: 0, zscores: {},
      isAnomaly: false, readingCount: 0, anomalyCount: 0,
      connected: false, healthScore: 100,
    };
  }
  return init;
}

export function useSimulationSSE() {
  const [machines, setMachines] = useState<Record<string, MachineSSEState>>(createInitialState);
  const [scoreHistory, setScoreHistory] = useState<ScorePoint[]>([]);
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState<AgentMaintenance[]>([]);
  const [uptime, setUptime] = useState(0);
  const machinesRef = useRef<Record<string, MachineSSEState>>(createInitialState());
  const startRef = useRef(Date.now());

  /* ── SSE connections (4 machines simultaneously) ──────────────── */
  useEffect(() => {
    const sources: EventSource[] = [];

    for (const machineId of MACHINES) {
      const es = new EventSource(`${SIM_URL}/stream/${machineId}`);

      es.onmessage = (event) => {
        try {
          const reading = JSON.parse(event.data) as SensorReading;
          reading.machine_id = machineId;

          setMachines(prev => {
            const state = prev[machineId];
            const newHistory = [...state.history, reading].slice(-WINDOW_SIZE);
            const { zscores, score, isAnomaly } = computeZScores(newHistory, reading);
            const healthScore = Math.max(0, Math.round((1 - score) * 100));

            const newState = {
              ...prev,
              [machineId]: {
                latest: reading,
                history: newHistory,
                anomalyScore: score,
                zscores,
                isAnomaly,
                readingCount: state.readingCount + 1,
                anomalyCount: state.anomalyCount + (isAnomaly ? 1 : 0),
                connected: true,
                healthScore,
              },
            };
            machinesRef.current = newState;
            return newState;
          });
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        setMachines(prev => {
          const newState = { ...prev, [machineId]: { ...prev[machineId], connected: false } };
          machinesRef.current = newState;
          return newState;
        });
      };

      sources.push(es);
    }

    return () => sources.forEach(s => s.close());
  }, []);

  /* ── Score history (1 snapshot / sec for the chart) ────────────── */
  useEffect(() => {
    const interval = setInterval(() => {
      const cur = machinesRef.current;
      if (!Object.values(cur).some(m => m.readingCount > 0)) return;

      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour12: false });
      const point: ScorePoint = {
        time, timestamp: now.getTime(),
        CNC_01: cur.CNC_01.anomalyScore,
        CNC_02: cur.CNC_02.anomalyScore,
        PUMP_03: cur.PUMP_03.anomalyScore,
        CONVEYOR_04: cur.CONVEYOR_04.anomalyScore,
      };
      setScoreHistory(prev => [...prev, point].slice(-SCORE_HISTORY_MAX));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ── Poll agent alerts + maintenance from simulation server ───── */
  useEffect(() => {
    const poll = async () => {
      try {
        const [aRes, mRes] = await Promise.all([
          fetch(`${SIM_URL}/alerts`).catch(() => null),
          fetch(`${SIM_URL}/maintenance-schedule`).catch(() => null),
        ]);
        if (aRes?.ok) { const d = await aRes.json(); setAlerts(Array.isArray(d) ? d : []); }
        if (mRes?.ok) { const d = await mRes.json(); setMaintenanceSchedule(Array.isArray(d) ? d : []); }
      } catch { /* non-fatal */ }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  /* ── Uptime counter ───────────────────────────────────────────── */
  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return { machines, scoreHistory, alerts, maintenanceSchedule, uptime, machineIds: MACHINES };
}
