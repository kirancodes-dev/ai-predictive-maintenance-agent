import { useState, useEffect, useRef, useCallback } from 'react';

export interface SensorReading {
  sensorId: string;
  machineId: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
  isAnomaly: boolean;
}

const MAX_READINGS = 300;

export const useStreamData = (machineId: string) => {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);

  const connect = useCallback(() => {
    if (!activeRef.current) return;
    const token = localStorage.getItem('access_token');
    if (!token || !machineId) return;

    const base = (import.meta.env.VITE_WS_URL as string) ?? 'ws://localhost:8000';
    const ws = new WebSocket(`${base}/ws/${machineId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => { if (activeRef.current) setIsConnected(true); };
    ws.onclose = () => {
      if (!activeRef.current) return;
      setIsConnected(false);
      timerRef.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'sensor_update') {
          setReadings((prev) => {
            const next = [...prev, msg.payload as SensorReading];
            return next.length > MAX_READINGS ? next.slice(-MAX_READINGS) : next;
          });
        }
      } catch {
        // ignore parse errors
      }
    };
  }, [machineId]);

  useEffect(() => {
    activeRef.current = true;
    setReadings([]);
    connect();
    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const clearReadings = useCallback(() => setReadings([]), []);

  return { readings, isConnected, clearReadings };
};
