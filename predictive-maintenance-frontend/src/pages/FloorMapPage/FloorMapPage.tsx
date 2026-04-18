import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { streamApi } from '../../services/api/streamApi';
import { useMachineData } from '../../hooks/useMachineData';
import { isolationApi } from '../../services/api/isolationApi';
import './FloorMapPage.css';

const MACHINE_IDS = ['CNC_01', 'CNC_02', 'PUMP_03', 'CONVEYOR_04'];

/* Layout positions for each machine on the SVG floor (% based) */
const LAYOUT: Record<string, { x: number; y: number; w: number; h: number; label: string; icon: string }> = {
  CNC_01:      { x: 8,  y: 12, w: 22, h: 32, label: 'CNC Mill 01',        icon: '⚙️' },
  CNC_02:      { x: 38, y: 12, w: 22, h: 32, label: 'CNC Lathe 02',       icon: '🔧' },
  PUMP_03:     { x: 68, y: 12, w: 22, h: 32, label: 'Industrial Pump 03',  icon: '💧' },
  CONVEYOR_04: { x: 8,  y: 58, w: 82, h: 30, label: 'Conveyor Belt 04',   icon: '📦' },
};

function riskColor(risk?: string, status?: string): string {
  if (risk === 'critical' || status === 'critical') return '#ef4444';
  if (risk === 'high'     || status === 'warning')  return '#f97316';
  if (risk === 'medium')                             return '#f59e0b';
  return '#22c55e';
}

function riskGlow(risk?: string, status?: string): string {
  const c = riskColor(risk, status);
  return `0 0 18px ${c}80, 0 0 40px ${c}40`;
}

const FloorMapPage: React.FC = () => {
  const { data: machinesData } = useMachineData();
  const machines = machinesData?.items ?? [];

  /* Fetch isolation status */
  const { data: isoData } = useQuery(
    'isolationStatus',
    () => isolationApi.getStatus().then((r) => r.data?.data || {}),
    { refetchInterval: 5_000, staleTime: 4_000, retry: 0 },
  );
  const isolationStatuses = isoData || {};

  /* Poll live sensor data per machine */
  const liveQueries = MACHINE_IDS.map((id) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery(
      ['live', id],
      () => streamApi.getLive(id).then((r) => r.data.data),
      { refetchInterval: 5_000, staleTime: 4_000, retry: 0 },
    ),
  );

  const getSensor = (idx: number, name: string): string => {
    const d = liveQueries[idx].data;
    if (!d || d.length === 0) return '—';
    const s = d.find((r: any) => r.sensor_type === name);
    return s ? `${Number(s.value).toFixed(1)}` : '—';
  };

  return (
    <div className="floor-map">
      <div className="floor-map__header">
        <div>
          <h1 className="floor-map__title">Factory Floor Map</h1>
          <p className="floor-map__subtitle">Live machine status · pulsing = risk level · click to inspect</p>
        </div>
      </div>

      <div className="floor-map__canvas">
        {/* Background grid */}
        <svg className="floor-map__grid" viewBox="0 0 1000 600" preserveAspectRatio="none">
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={600} stroke="var(--color-border,#e2e8f0)" strokeWidth="0.5" opacity="0.4" />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 50} x2={1000} y2={i * 50} stroke="var(--color-border,#e2e8f0)" strokeWidth="0.5" opacity="0.4" />
          ))}
        </svg>

        {/* Factory walls */}
        <div className="floor-map__walls" />

        {/* Machine zones */}
        {MACHINE_IDS.map((id, idx) => {
          const layout = LAYOUT[id];
          const m = machines.find((mc) => mc.id === id);
          const iso = isolationStatuses[id];
          const isIsolated = iso?.isIsolated || false;
          const color = isIsolated ? '#ef4444' : riskColor(m?.riskLevel, m?.status);
          const isPulsing = !isIsolated && color !== '#22c55e';
          const temp = getSensor(idx, 'temperature');
          const vib = getSensor(idx, 'vibration');

          return (
            <Link
              key={id}
              to={`/machines/${id}`}
              className={`floor-map__machine${isPulsing ? ' floor-map__machine--pulse' : ''}${isIsolated ? ' floor-map__machine--isolated' : ''}`}
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: `${layout.w}%`,
                height: `${layout.h}%`,
                '--machine-color': color,
                borderColor: color,
                boxShadow: isIsolated ? '0 0 20px rgba(239,68,68,0.3)' : riskGlow(m?.riskLevel, m?.status),
              } as React.CSSProperties}
            >
              {isIsolated && (
                <div className="floor-map__isolation-overlay">
                  <span className="floor-map__isolation-icon">🔒</span>
                  <span className="floor-map__isolation-label">ISOLATED</span>
                </div>
              )}
              <div className="floor-map__machine-header">
                <span className="floor-map__machine-icon">{layout.icon}</span>
                <span className="floor-map__machine-name">{layout.label}</span>
                <span className="floor-map__machine-status" style={{ background: isIsolated ? '#ef4444' : color }}>
                  {isIsolated ? '🔒 isolated' : (m?.status ?? 'unknown')}
                </span>
              </div>
              <div className="floor-map__machine-sensors">
                <div className="floor-map__sensor">
                  <span className="floor-map__sensor-label">🌡 Temp</span>
                  <span className="floor-map__sensor-value">{temp}°C</span>
                </div>
                <div className="floor-map__sensor">
                  <span className="floor-map__sensor-label">📳 Vib</span>
                  <span className="floor-map__sensor-value">{vib} mm/s</span>
                </div>
              </div>
              <div className="floor-map__machine-risk" style={{ color }}>
                {m?.riskLevel ?? 'normal'}
              </div>
            </Link>
          );
        })}

        {/* Conveyor path arrows */}
        <svg className="floor-map__arrows" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
          </defs>
          {/* CNC_01 → Conveyor */}
          <line x1="19" y1="44" x2="19" y2="56" stroke="#94a3b8" strokeWidth="0.3" strokeDasharray="1,1" markerEnd="url(#arrowhead)" />
          {/* CNC_02 → Conveyor */}
          <line x1="49" y1="44" x2="49" y2="56" stroke="#94a3b8" strokeWidth="0.3" strokeDasharray="1,1" markerEnd="url(#arrowhead)" />
          {/* PUMP_03 → Conveyor */}
          <line x1="79" y1="44" x2="79" y2="56" stroke="#94a3b8" strokeWidth="0.3" strokeDasharray="1,1" markerEnd="url(#arrowhead)" />
        </svg>
      </div>

      {/* Legend */}
      <div className="floor-map__legend">
        {[
          { color: '#22c55e', label: 'Normal' },
          { color: '#f59e0b', label: 'Medium Risk' },
          { color: '#f97316', label: 'High Risk' },
          { color: '#ef4444', label: 'Critical' },
          { color: '#ef4444', label: '🔒 Isolated', dashed: true },
        ].map(({ color, label, dashed }) => (
          <div key={label} className="floor-map__legend-item">
            <span
              className="floor-map__legend-dot"
              style={{
                background: dashed ? 'transparent' : color,
                border: dashed ? `2px dashed ${color}` : 'none',
              }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FloorMapPage;
