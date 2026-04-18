import React, { useEffect, useRef, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  useSimulationSSE,
  MachineSSEState, ScorePoint, AgentAlert, AgentMaintenance,
} from '../../hooks/useSimulationSSE';
import './AgentDashboard.css';

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */
const MACHINE_LABELS: Record<string, string> = {
  CNC_01: 'CNC Mill 01', CNC_02: 'CNC Lathe 02',
  PUMP_03: 'Coolant Pump 03', CONVEYOR_04: 'Conveyor Belt 04',
};
const MACHINE_TYPES: Record<string, string> = {
  CNC_01: 'Bearing Wear', CNC_02: 'Thermal Runaway',
  PUMP_03: 'Cavitation', CONVEYOR_04: 'Baseline Healthy',
};
const MACHINE_COLORS: Record<string, string> = {
  CNC_01: '#ff3366', CNC_02: '#3399ff',
  PUMP_03: '#ffaa00', CONVEYOR_04: '#00ff88',
};

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */
function formatUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
function healthColor(score: number) {
  return score >= 80 ? '#00ff88' : score >= 50 ? '#ffaa00' : '#ff3366';
}
function healthLabel(score: number) {
  return score >= 80 ? 'HEALTHY' : score >= 50 ? 'WARNING' : 'CRITICAL';
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════ */

/* ── Status Bar ──────────────────────────────────────────────────── */
const StatusBar: React.FC<{
  machines: Record<string, MachineSSEState>; uptime: number; alertCount: number;
}> = ({ machines, uptime, alertCount }) => {
  const vals = Object.values(machines);
  const conn = vals.filter(m => m.connected).length;
  const reads = vals.reduce((s, m) => s + m.readingCount, 0);
  const anoms = vals.reduce((s, m) => s + m.anomalyCount, 0);
  const live = conn > 0;

  return (
    <section className="agent-hero">
      <div className="agent-hero-left">
        <h1>🤖 IPMA Agent Command Center</h1>
        <span className={`agent-hero-badge ${live ? 'agent-hero-badge--live' : 'agent-hero-badge--offline'}`}>
          <span className="status-dot status-dot--live" style={{ background: live ? '#00ff88' : '#ff3366' }} />
          {live ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
      <div className="agent-stats">
        <Stat label="Uptime" value={formatUptime(uptime)} />
        <Stat label="Streams" value={`${conn}/4`} color={conn === 4 ? '#00ff88' : '#ffaa00'} />
        <Stat label="Readings" value={reads.toLocaleString()} />
        <Stat label="Anomalies" value={String(anoms)} color={anoms > 0 ? '#ff3366' : '#00ff88'} />
        <Stat label="Alerts" value={String(alertCount)} color={alertCount > 0 ? '#ffaa00' : '#00ff88'} />
      </div>
    </section>
  );
};

const Stat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="agent-stat">
    <span className="agent-stat__label">{label}</span>
    <span className="agent-stat__value" style={color ? { color } : undefined}>{value}</span>
  </div>
);

/* ── Machine Twin Card ───────────────────────────────────────────── */
const MachineTwinCard: React.FC<{ id: string; machine: MachineSSEState }> = ({ id, machine }) => {
  const color = healthColor(machine.healthScore);
  const label = healthLabel(machine.healthScore);
  const arc = (machine.healthScore / 100) * 157;

  return (
    <div className={`twin-card ${machine.isAnomaly ? 'twin-card--anomaly' : ''}`}
         style={{ borderTopColor: color }}>
      <div className="twin-header">
        <div>
          <span className="twin-name">{MACHINE_LABELS[id]}</span>
          <span className="twin-type">{MACHINE_TYPES[id]}</span>
        </div>
        <span className="twin-status" style={{ color }}>
          <span className={`status-dot ${machine.connected ? 'status-dot--live' : ''}`}
                style={{ background: machine.connected ? color : '#555' }} />
          {machine.connected ? 'LIVE' : 'OFF'}
        </span>
      </div>

      {/* Health Gauge */}
      <svg viewBox="0 0 120 70" className="twin-gauge">
        <path d="M 10 62 A 50 50 0 0 1 110 62" fill="none"
              stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 62 A 50 50 0 0 1 110 62" fill="none"
              stroke={color} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${arc} 157`}
              style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="60" y="50" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700">
          {machine.healthScore}%
        </text>
        <text x="60" y="65" textAnchor="middle" fill={color} fontSize="8" fontWeight="700">{label}</text>
      </svg>

      {/* Sensor Readings */}
      {machine.latest ? (
        <div className="twin-sensors">
          <div className="twin-sensor">
            <span className="twin-sensor-label">🌡️ Temp</span>
            <span className="twin-sensor-value">{machine.latest.temperature_C.toFixed(1)}°C</span>
          </div>
          <div className="twin-sensor">
            <span className="twin-sensor-label">📳 Vibration</span>
            <span className="twin-sensor-value">{machine.latest.vibration_mm_s.toFixed(2)} mm/s</span>
          </div>
          <div className="twin-sensor">
            <span className="twin-sensor-label">🔄 RPM</span>
            <span className="twin-sensor-value">{Math.round(machine.latest.rpm)}</span>
          </div>
          <div className="twin-sensor">
            <span className="twin-sensor-label">⚡ Current</span>
            <span className="twin-sensor-value">{machine.latest.current_A.toFixed(1)} A</span>
          </div>
        </div>
      ) : (
        <div className="twin-sensors" style={{ opacity: 0.3 }}>
          <span style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1.5rem', fontSize: 12, color: '#556' }}>
            Waiting for data…
          </span>
        </div>
      )}

      {/* Z-Score Breakdown */}
      {Object.keys(machine.zscores).length > 0 && (
        <div className="zscore-bar">
          {Object.entries(machine.zscores).map(([key, val]) => (
            <div key={key} className="zscore-item">
              <span className="zscore-label">{key.split('_')[0]}</span>
              <span className="zscore-value"
                    style={{ color: val > 3 ? '#ff3366' : val > 2 ? '#ffaa00' : '#00ff88' }}>
                {val.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="twin-footer">
        <span>📊 {machine.readingCount}</span>
        <span style={{ color: machine.anomalyCount > 0 ? '#ff3366' : '#556' }}>
          ⚠ {machine.anomalyCount}
        </span>
      </div>

      <div className="twin-score-bar">
        <div className="twin-score-fill"
             style={{
               width: `${Math.min(100, machine.anomalyScore * 100)}%`,
               background: color,
               boxShadow: `0 0 8px ${color}`,
             }} />
      </div>
    </div>
  );
};

/* ── Factory Floor SVG ───────────────────────────────────────────── */
const POSITIONS = [
  { id: 'CNC_01',      x: 130, y: 95,  icon: '⚙️' },
  { id: 'CNC_02',      x: 470, y: 95,  icon: '🔧' },
  { id: 'PUMP_03',     x: 130, y: 305, icon: '💧' },
  { id: 'CONVEYOR_04', x: 470, y: 305, icon: '📦' },
];

const FactoryFloor: React.FC<{ machines: Record<string, MachineSSEState> }> = ({ machines }) => (
  <svg viewBox="0 0 600 400" className="factory-svg">
    <defs>
      <pattern id="factory-grid" width="30" height="30" patternUnits="userSpaceOnUse">
        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      </pattern>
      <filter id="neon-glow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    {/* Background */}
    <rect width="600" height="400" fill="#060a14" rx="12" />
    <rect width="600" height="400" fill="url(#factory-grid)" rx="12" />

    {/* Zone labels */}
    <text x="130" y="30" textAnchor="middle" fill="#223" fontSize="10" fontWeight="600">ZONE A</text>
    <text x="470" y="30" textAnchor="middle" fill="#223" fontSize="10" fontWeight="600">ZONE A</text>
    <text x="130" y="375" textAnchor="middle" fill="#223" fontSize="10" fontWeight="600">ZONE B</text>
    <text x="470" y="375" textAnchor="middle" fill="#223" fontSize="10" fontWeight="600">ZONE C</text>

    {/* Connection lines + data particles */}
    {POSITIONS.map(pos => {
      const m = machines[pos.id];
      const anom = m?.isAnomaly ?? false;
      const clr = anom ? '#ff3366' : 'rgba(100,150,255,0.25)';
      return (
        <g key={`line-${pos.id}`}>
          <line x1={pos.x} y1={pos.y} x2={300} y2={200}
                stroke={clr} strokeWidth={anom ? 2.5 : 1.5} strokeDasharray="8,6"
                opacity={m?.connected ? 1 : 0.15}>
            <animate attributeName="stroke-dashoffset" values="0;-14"
                     dur={anom ? '0.5s' : '1s'} repeatCount="indefinite" />
          </line>
          {m?.connected && (
            <circle r="3" fill={anom ? '#ff3366' : '#3399ff'} opacity="0.8">
              <animateMotion dur={anom ? '0.8s' : '1.5s'} repeatCount="indefinite"
                             path={`M${pos.x},${pos.y} L300,200`} />
            </circle>
          )}
        </g>
      );
    })}

    {/* Central AI Brain */}
    <g transform="translate(300, 200)">
      <circle r="50" fill="none" stroke="#7c3aed" strokeWidth="1" opacity="0.3">
        <animate attributeName="r" values="45;55;45" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle r="38" fill="rgba(124,58,237,0.08)" stroke="#7c3aed" strokeWidth="2" filter="url(#neon-glow)">
        <animate attributeName="r" values="36;40;36" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle r="26" fill="rgba(124,58,237,0.12)" />
      <text textAnchor="middle" dy="-4" fill="#c4a0ff" fontSize="18">🧠</text>
      <text textAnchor="middle" dy="14" fill="#9b7de8" fontSize="9" fontWeight="800" letterSpacing="0.1em">IPMA</text>
    </g>

    {/* Machine nodes */}
    {POSITIONS.map(pos => {
      const m = machines[pos.id];
      const hp = m?.healthScore ?? 100;
      const clr = healthColor(hp);
      const anom = m?.isAnomaly ?? false;
      return (
        <g key={pos.id} transform={`translate(${pos.x}, ${pos.y})`}>
          {anom && (
            <circle r="55" fill="none" stroke={clr} strokeWidth="1.5" opacity="0.4">
              <animate attributeName="r" values="48;62;48" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
            </circle>
          )}
          <rect x="-48" y="-35" width="96" height="70" rx="12"
                fill="rgba(0,0,0,0.5)" stroke={clr} strokeWidth="2"
                style={{ filter: anom ? `drop-shadow(0 0 10px ${clr})` : 'none' }} />
          <text textAnchor="middle" dy="-8" fontSize="20">{pos.icon}</text>
          <text textAnchor="middle" dy="12" fill="#ccd" fontSize="10" fontWeight="700">{pos.id}</text>
          <text textAnchor="middle" dy="26" fill={clr} fontSize="9" fontWeight="700">{hp}% HP</text>
          <circle cx="40" cy="-27" r="4" fill={m?.connected ? clr : '#333'}>
            {m?.connected && (
              <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
            )}
          </circle>
        </g>
      );
    })}

    {/* Legend */}
    <g transform="translate(15, 393)">
      <circle cx="0" cy="-3" r="3" fill="#00ff88" />
      <text x="8" y="0" fill="#445" fontSize="8">Healthy</text>
      <circle cx="65" cy="-3" r="3" fill="#ffaa00" />
      <text x="73" y="0" fill="#445" fontSize="8">Warning</text>
      <circle cx="130" cy="-3" r="3" fill="#ff3366" />
      <text x="138" y="0" fill="#445" fontSize="8">Critical</text>
      <text x="210" y="0" fill="#334" fontSize="8">─ ─ Data Flow</text>
    </g>
  </svg>
);

/* ── Anomaly Score Chart ─────────────────────────────────────────── */
const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: '10px 14px', fontSize: 11,
    }}>
      <div style={{ color: '#667', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#aab' }}>{p.dataKey}:</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>{(p.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

const AnomalyScoreChart: React.FC<{ data: ScorePoint[] }> = ({ data }) => (
  <div>
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <defs>
          {Object.entries(MACHINE_COLORS).map(([id, color]) => (
            <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="time" stroke="#445" fontSize={9} tickLine={false} />
        <YAxis domain={[0, 1]} stroke="#445" fontSize={9} tickLine={false}
               tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
        <Tooltip content={<ChartTooltip />} />
        <ReferenceLine y={0.5} stroke="#ff3366" strokeDasharray="6 4" strokeOpacity={0.6}
                       label={{ value: 'Threshold', fill: '#ff3366', fontSize: 9, position: 'right' }} />
        {Object.entries(MACHINE_COLORS).map(([id, color]) => (
          <Area key={id} type="monotone" dataKey={id} stroke={color}
                fill={`url(#grad-${id})`} strokeWidth={2} dot={false} animationDuration={300} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
    <div className="chart-legend">
      {Object.entries(MACHINE_COLORS).map(([id, color]) => (
        <div key={id} className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: color }} />{id}
        </div>
      ))}
    </div>
  </div>
);

/* ── Agent Activity Feed ─────────────────────────────────────────── */
const AgentFeed: React.FC<{ alerts: AgentAlert[]; maintenance: AgentMaintenance[] }> = ({ alerts, maintenance }) => {
  const feedRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const all: { type: 'alert' | 'maintenance'; data: any; ts: number }[] = [];
    for (const a of alerts)
      all.push({ type: 'alert', data: a, ts: a.timestamp ? new Date(a.timestamp).getTime() : 0 });
    for (const m of maintenance)
      all.push({ type: 'maintenance', data: m, ts: m.timestamp ? new Date(m.timestamp).getTime() : 0 });
    return all.sort((a, b) => b.ts - a.ts);
  }, [alerts, maintenance]);

  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = 0; }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="feed-empty">
        <span className="feed-empty-icon">🔍</span>
        <p>Waiting for IPMA agent activity…</p>
        <p className="feed-hint">Run: <code>cd agent && python main.py</code></p>
      </div>
    );
  }

  return (
    <div className="feed-list" ref={feedRef}>
      {items.map((item, i) => (
        <div key={`${item.type}-${i}`} className="feed-item">
          <span className="feed-icon">{item.type === 'alert' ? '🚨' : '🔧'}</span>
          <div className="feed-content">
            <span className="feed-machine">
              {item.data.machine_id}
              <span className="feed-type">{item.type === 'alert' ? 'ALERT' : 'MAINT'}</span>
            </span>
            <span className="feed-reason">
              {item.type === 'alert'
                ? (item.data.reason || 'Anomaly detected')
                : `Scheduled → ${item.data.proposed_slot || 'next slot'}`}
            </span>
          </div>
          <span className="feed-time">
            {item.data.timestamp
              ? new Date(item.data.timestamp).toLocaleTimeString('en-US', { hour12: false })
              : '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── ML Insights Panel ───────────────────────────────────────────── */
const InsightRow: React.FC<{
  icon: string; label: string; value: string; highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
  <div className="insight-row">
    <span className="insight-icon">{icon}</span>
    <span className="insight-label">{label}</span>
    <span className={`insight-value ${highlight ? 'insight-value--highlight' : ''}`}>{value}</span>
  </div>
);

const MLInsights: React.FC<{
  machines: Record<string, MachineSSEState>;
  uptime: number; alertCount: number; maintenanceCount: number;
}> = ({ machines, uptime, alertCount, maintenanceCount }) => {
  const vals = Object.values(machines);
  const totalR = vals.reduce((s, m) => s + m.readingCount, 0);
  const totalA = vals.reduce((s, m) => s + m.anomalyCount, 0);
  const rate = totalR > 0 ? ((totalA / totalR) * 100).toFixed(1) : '0.0';
  const avgHp = Math.round(vals.reduce((s, m) => s + m.healthScore, 0) / vals.length);
  const rpm = uptime > 0 ? Math.round((totalR / uptime) * 60) : 0;
  const conn = vals.filter(m => m.connected).length;

  const sT: Record<string, number> = {};
  for (const m of vals) for (const [k, v] of Object.entries(m.zscores)) sT[k] = (sT[k] || 0) + v;
  const top = Object.entries(sT).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="insights-grid">
      <InsightRow icon="🎯" label="Detection Model" value="Z-Score + IF Ensemble" />
      <InsightRow icon="📊" label="Anomaly Rate" value={`${rate}%`} highlight={Number(rate) > 10} />
      <InsightRow icon="💚" label="Avg System Health" value={`${avgHp}%`} />
      <InsightRow icon="⚡" label="Throughput" value={`${rpm} readings/min`} />
      <InsightRow icon="🔬" label="Most Affected Sensor" value={top ? top[0].replace(/_/g, ' ') : '—'} />
      <InsightRow icon="🔄" label="Rolling Window" value="120 readings" />
      <InsightRow icon="📡" label="Active Streams" value={`${conn}/4 connected`} />
      <InsightRow icon="🚨" label="Alerts Fired" value={String(alertCount)} highlight={alertCount > 0} />
      <InsightRow icon="🔧" label="Maintenance Scheduled" value={String(maintenanceCount)} />
      <InsightRow icon="⏱️" label="Avg Latency" value="< 1ms" />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════════ */
export const AgentDashboardPage: React.FC = () => {
  const { machines, scoreHistory, alerts, maintenanceSchedule, uptime, machineIds } = useSimulationSSE();

  return (
    <div className="agent-dashboard">
      <StatusBar machines={machines} uptime={uptime} alertCount={alerts.length} />

      <section className="twin-grid">
        {machineIds.map(id => (
          <MachineTwinCard key={id} id={id} machine={machines[id]} />
        ))}
      </section>

      <section className="center-grid">
        <div className="agent-card factory-card">
          <h3>🏭 Factory Floor — Live Topology</h3>
          <FactoryFloor machines={machines} />
        </div>
        <div className="agent-card chart-card">
          <h3>📈 Anomaly Score Timeline</h3>
          <AnomalyScoreChart data={scoreHistory} />
        </div>
      </section>

      <section className="bottom-grid">
        <div className="agent-card feed-card">
          <h3>🔔 Agent Activity Feed</h3>
          <AgentFeed alerts={alerts} maintenance={maintenanceSchedule} />
        </div>
        <div className="agent-card insights-card">
          <h3>🧠 System Intelligence</h3>
          <MLInsights
            machines={machines} uptime={uptime}
            alertCount={alerts.length} maintenanceCount={maintenanceSchedule.length}
          />
        </div>
      </section>
    </div>
  );
};

export default AgentDashboardPage;
