import React, { useEffect, useState, useCallback } from 'react';
import { isolationApi } from '../../services/api/isolationApi';
import type { IsolationStatus, IsolationRecord } from '../../services/api/isolationApi';
import './CascadeIsolationPage.css';

const MACHINES = [
  { id: 'CNC_01',      name: 'CNC Machine #1',  zone: 'Zone A', type: 'CNC Mill',       icon: '⚙️',  color: '#3b82f6' },
  { id: 'CNC_02',      name: 'CNC Machine #2',  zone: 'Zone A', type: 'CNC Lathe',      icon: '🔩',  color: '#8b5cf6' },
  { id: 'PUMP_03',     name: 'Pump Station #3', zone: 'Zone B', type: 'Industrial Pump',icon: '💧',  color: '#06b6d4' },
  { id: 'CONVEYOR_04', name: 'Conveyor Belt #4',zone: 'Zone C', type: 'Conveyor Belt',  icon: '🏭',  color: '#10b981' },
];

function emptyStatus(id: string): IsolationStatus {
  const m = MACHINES.find(m => m.id === id);
  return { machineId: id, machineName: m?.name ?? id, zone: m?.zone ?? '', position: [0,0], line: 'Line-1', downstream: [], upstream: [], isIsolated: false, isolation: null };
}

const CascadeIsolationPage: React.FC = () => {
  const [statuses, setStatuses] = useState<Record<string, IsolationStatus>>({});
  const [history, setHistory]   = useState<IsolationRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, hRes] = await Promise.all([
        isolationApi.getStatus(),
        isolationApi.getHistory(undefined, 20),
      ]);
      setStatuses(sRes.data?.data || {});
      setHistory(hRes.data?.data || []);
      setError(null);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load isolation data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 5000); return () => clearInterval(iv); }, [fetchAll]);

  const isolate = async (id: string) => {
    setActing(id);
    try { await isolationApi.isolate(id, `Operator isolated ${id} to protect downstream machines`); await fetchAll(); }
    catch (e: any) { setError(e.response?.data?.detail || 'Isolation failed'); }
    finally { setActing(null); }
  };

  const release = async (id: string) => {
    setActing(id);
    try { await isolationApi.release(id); await fetchAll(); }
    catch (e: any) { setError(e.response?.data?.detail || 'Release failed'); }
    finally { setActing(null); }
  };

  const getS = (id: string) => statuses[id] ?? emptyStatus(id);

  // A machine's upstream is blocked if any machine earlier in the chain is isolated
  const isBlocked = (id: string): boolean => {
    const idx = MACHINES.findIndex(m => m.id === id);
    for (let i = 0; i < idx; i++) {
      if (getS(MACHINES[i].id).isIsolated) return true;
    }
    return false;
  };

  const isolated = MACHINES.filter(m => getS(m.id).isIsolated).length;
  const blocked  = MACHINES.filter(m => !getS(m.id).isIsolated && isBlocked(m.id)).length;

  if (loading) return <div className="cascade-page"><div className="cascade-page__empty">Loading…</div></div>;

  return (
    <div className="cascade-page">
      <header className="cascade-page__header">
        <h1 className="cascade-page__title">🛡️ Cascade Safety — Production Line</h1>
        <p className="cascade-page__subtitle">
          4-machine sequential line: CNC_01 → CNC_02 → PUMP_03 → CONVEYOR_04.
          Isolating any machine immediately cuts flow to all downstream machines.
        </p>
      </header>

      {error && <div className="cascade-page__error-banner">⚠️ {error}</div>}

      {/* Summary bar */}
      <div className="cascade-page__status-bar">
        {[
          { label: 'Total',    value: '4',            cls: '' },
          { label: 'Online',   value: String(4 - isolated - blocked), cls: 'cascade-page__status-value--safe' },
          { label: 'Isolated', value: String(isolated), cls: isolated > 0 ? 'cascade-page__status-value--danger' : 'cascade-page__status-value--safe' },
          { label: 'Blocked',  value: String(blocked),  cls: blocked  > 0 ? 'cascade-page__status-value--warn'   : 'cascade-page__status-value--safe' },
          { label: 'Threshold','value': '85 / 100',     cls: 'cascade-page__status-value--warn' },
        ].map(item => (
          <div key={item.label} className="cascade-page__status-card">
            <div className="cascade-page__status-label">{item.label}</div>
            <div className={`cascade-page__status-value ${item.cls}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="room-legend">
        <span className="room-legend__item room-legend__item--online">🟢 Online</span>
        <span className="room-legend__item room-legend__item--isolated">🔒 Isolated</span>
        <span className="room-legend__item room-legend__item--blocked">⛔ Flow Blocked</span>
      </div>

      {/* ── 4-machine flow diagram ── */}
      <section className="room-section" style={{ padding: '24px 0' }}>
        <h2 className="room-section__title" style={{ marginBottom: 20 }}>🗺️ Production Line Flow</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {MACHINES.map((m, idx) => {
            const s      = getS(m.id);
            const blk    = isBlocked(m.id);
            const isLast = idx === MACHINES.length - 1;

            // Which arrow class follows this node
            const nextBlocked = !isLast && (s.isIsolated || (isBlocked(MACHINES[idx + 1].id)));

            const bgColor = s.isIsolated ? 'rgba(220,38,38,0.1)' : blk ? 'rgba(251,191,36,0.1)' : `${m.color}18`;
            const borderColor = s.isIsolated ? '#dc2626' : blk ? '#f59e0b' : m.color;

            return (
              <React.Fragment key={m.id}>
                {/* Machine card */}
                <div style={{
                  minWidth: 180, borderRadius: 14,
                  border: `2px solid ${borderColor}`,
                  background: bgColor,
                  padding: '18px 16px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  position: 'relative',
                }}>
                  {/* Status badge */}
                  <div style={{
                    position: 'absolute', top: 8, right: 8, fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 99,
                    background: s.isIsolated ? '#dc2626' : blk ? '#f59e0b' : '#059669',
                    color: '#fff',
                  }}>
                    {s.isIsolated ? '🔒 ISOLATED' : blk ? '⛔ BLOCKED' : '✅ ONLINE'}
                  </div>

                  <div style={{ fontSize: 24 }}>{m.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>{m.id}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-subtle, #94a3b8)', marginTop: 2 }}>
                    {m.zone} · {m.type}
                  </div>

                  {s.isolation && (
                    <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, lineHeight: 1.4 }}>
                      Risk at isolation: {s.isolation.riskScoreAtIsolation?.toFixed(0) ?? '—'}%<br/>
                      By: {s.isolation.triggeredBy}
                    </div>
                  )}

                  {/* Downstream info */}
                  {!isLast && (
                    <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
                      Downstream: {MACHINES[idx + 1].id}
                      {idx < MACHINES.length - 2 && ` (+${MACHINES.length - idx - 2} more)`}
                    </div>
                  )}

                  {/* Action button */}
                  {!blk && (
                    <button
                      disabled={acting === m.id}
                      onClick={() => s.isIsolated ? release(m.id) : isolate(m.id)}
                      style={{
                        marginTop: 8, padding: '6px 12px', borderRadius: 8,
                        border: `1.5px solid ${s.isIsolated ? '#059669' : '#dc2626'}`,
                        background: s.isIsolated ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
                        color: s.isIsolated ? '#059669' : '#dc2626',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      {acting === m.id ? '⏳ …' : s.isIsolated ? '🔓 Release' : '🔒 Isolate'}
                    </button>
                  )}
                </div>

                {/* Arrow between machines */}
                {!isLast && (
                  <div style={{
                    fontSize: 22, fontWeight: 700, minWidth: 32, textAlign: 'center',
                    color: nextBlocked ? '#dc2626' : '#64748b',
                    flexShrink: 0,
                  }}>
                    {nextBlocked ? '⛔' : '→'}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section style={{
        background: 'var(--color-surface)', borderRadius: 14,
        border: '1.5px solid var(--color-border)',
        padding: '20px 24px', marginTop: 8,
      }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, marginTop: 0 }}>
          🤖 How Cascade Isolation Works
        </h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.9 }}>
          <li>Automation loop polls machine risk scores every <strong>30 seconds</strong></li>
          <li>When any machine exceeds <strong>risk 85/100</strong>, it is <strong>automatically isolated</strong></li>
          <li>All downstream machines immediately show <strong>Flow Blocked</strong></li>
          <li>WebSocket broadcasts <code>cascade_warning</code> + <code>machine_isolated</code> events to all clients</li>
          <li>Operator can also <strong>manually isolate / release</strong> any machine from this page</li>
          <li>5-minute unacknowledged alert → auto-escalated to best available technician</li>
        </ul>
      </section>

      {/* Isolation Event Log */}
      <section className="cascade-page__history">
        <h2 className="cascade-page__history-title">📋 Isolation Event Log</h2>
        {history.length === 0 ? (
          <div className="cascade-page__empty">No isolation events recorded yet. All systems clear.</div>
        ) : (
          <div className="cascade-page__history-list">
            {history.map((h) => (
              <div key={h.id} className="cascade-page__history-item">
                <span className="cascade-page__history-icon">{h.isIsolated ? '🔒' : '🔓'}</span>
                <div className="cascade-page__history-content">
                  <div className="cascade-page__history-machine">{h.machineName}</div>
                  <div className="cascade-page__history-reason">{h.reason}</div>
                  <div className="cascade-page__history-meta">
                    <span>Risk: {h.riskScoreAtIsolation?.toFixed(0) ?? '—'}%</span>
                    <span>{h.isolatedAt ? new Date(h.isolatedAt).toLocaleString() : '—'}</span>
                    {h.protectedMachineNames.length > 0 && <span>Protected: {h.protectedMachineNames.join(', ')}</span>}
                  </div>
                </div>
                <span className={`cascade-page__history-badge ${!h.isIsolated ? 'cascade-page__history-badge--released' : h.isolationType === 'auto' ? 'cascade-page__history-badge--auto' : 'cascade-page__history-badge--manual'}`}>
                  {!h.isIsolated ? 'Released' : h.isolationType === 'auto' ? 'Auto' : 'Manual'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CascadeIsolationPage;
