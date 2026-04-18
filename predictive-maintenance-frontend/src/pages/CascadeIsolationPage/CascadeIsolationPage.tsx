import React, { useEffect, useState, useCallback } from 'react';
import { isolationApi } from '../../services/api/isolationApi';
import type { IsolationStatus, IsolationRecord } from '../../services/api/isolationApi';
import './CascadeIsolationPage.css';

// ── 36-machine floor topology ─────────────────────────────────────────────
// 4 lines × (9, 9, 12, 6) machines. M27 is the fault point in Line 3.

type LineConfig = { label: string; ids: string[]; zone: string; color: string; icon: string };

const LINES: LineConfig[] = [
  {
    label: 'Line 1 — CNC Mills',
    zone: 'Zone A',
    icon: '⚙️',
    color: '#3b82f6',
    ids: ['M01','M02','M03','M04','M05','M06','M07','M08','M09'],
  },
  {
    label: 'Line 2 — Pumps',
    zone: 'Zone B',
    icon: '🔧',
    color: '#8b5cf6',
    ids: ['M10','M11','M12','M13','M14','M15','M16','M17','M18'],
  },
  {
    label: 'Line 3 — Conveyors  ⚠️ FAULT ZONE',
    zone: 'Zone C',
    icon: '🏭',
    color: '#ef4444',
    ids: ['M19','M20','M21','M22','M23','M24','M25','M26','M27','M28','M29','M30'],
  },
  {
    label: 'Line 4 — Compressors',
    zone: 'Zone D',
    icon: '💨',
    color: '#10b981',
    ids: ['M31','M32','M33','M34','M35','M36'],
  },
];

const FAULT_MACHINE = 'M27';
const DOWNSTREAM_OF_FAULT = ['M28', 'M29', 'M30'];
const ALL_IDS = LINES.flatMap((l) => l.ids);

function dummyStatus(machineId: string): IsolationStatus {
  const lineConf = LINES.find((l) => l.ids.includes(machineId));
  return {
    machineId,
    machineName: machineId,
    zone: lineConf?.zone ?? 'Floor',
    position: [0, 0],
    line: lineConf?.label ?? '',
    downstream: [],
    upstream: [],
    isIsolated: false,
    isolation: null,
  };
}

const CascadeIsolationPage: React.FC = () => {
  const [statuses, setStatuses] = useState<Record<string, IsolationStatus>>({});
  const [history, setHistory] = useState<IsolationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedLine, setExpandedLine] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([
        isolationApi.getStatus(),
        isolationApi.getHistory(undefined, 30),
      ]);
      setStatuses(statusRes.data?.data || {});
      setHistory(historyRes.data?.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load isolation data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 5000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const handleIsolate = async (machineId: string) => {
    setActionLoading(machineId);
    try {
      await isolationApi.isolate(machineId, `Operator safety override — isolating ${machineId} to protect downstream machines`);
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Isolation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = async (machineId: string) => {
    setActionLoading(machineId);
    try {
      await isolationApi.release(machineId);
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Release failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getS = (id: string): IsolationStatus => statuses[id] ?? dummyStatus(id);

  const isBlocked = (id: string): boolean => {
    const fault = statuses[FAULT_MACHINE];
    if (fault?.isIsolated && DOWNSTREAM_OF_FAULT.includes(id)) return true;
    const s = statuses[id];
    return (s?.upstream || []).some((upId) => statuses[upId]?.isIsolated);
  };

  const isolatedCount = ALL_IDS.filter((id) => getS(id).isIsolated).length;
  const blockedCount = ALL_IDS.filter((id) => !getS(id).isIsolated && isBlocked(id)).length;
  const onlineCount = ALL_IDS.length - isolatedCount - blockedCount;

  const getCellClass = (id: string): string => {
    const s = getS(id);
    if (s.isIsolated) return 'room-cell--isolated';
    if (isBlocked(id)) return 'room-cell--blocked';
    if (id === FAULT_MACHINE) return 'room-cell--fault';
    return 'room-cell--online';
  };

  if (loading) {
    return <div className="cascade-page"><div className="cascade-page__empty">Loading factory floor…</div></div>;
  }

  const faultStatus = getS(FAULT_MACHINE);
  const faultIsolated = faultStatus.isIsolated;

  return (
    <div className="cascade-page">
      <header className="cascade-page__header">
        <h1 className="cascade-page__title">
          🏭 Factory Floor — Room 1 · 36 Machines · Cascade Isolation
        </h1>
        <p className="cascade-page__subtitle">
          36-machine production room across 4 lines. When Machine 27 (Line 3) goes critical,
          it is automatically cut off — blocking flow to M28, M29, M30 to prevent cascade failure
          spreading to the rest of the room.
        </p>
      </header>

      {error && <div className="cascade-page__error-banner">⚠️ {error}</div>}

      {/* Summary */}
      <div className="cascade-page__status-bar">
        {[
          { label: 'Total', value: '36', cls: '' },
          { label: 'Online', value: String(onlineCount), cls: 'cascade-page__status-value--safe' },
          { label: 'Isolated', value: String(isolatedCount), cls: isolatedCount > 0 ? 'cascade-page__status-value--danger' : 'cascade-page__status-value--safe' },
          { label: 'Flow Blocked', value: String(blockedCount), cls: blockedCount > 0 ? 'cascade-page__status-value--warn' : 'cascade-page__status-value--safe' },
          { label: 'Lines', value: '4', cls: '' },
          { label: 'Fault Point', value: 'M27', cls: 'cascade-page__status-value--danger' },
        ].map((item) => (
          <div key={item.label} className="cascade-page__status-card">
            <div className="cascade-page__status-label">{item.label}</div>
            <div className={`cascade-page__status-value ${item.cls}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="room-legend">
        <span className="room-legend__item room-legend__item--online">🟢 Online</span>
        <span className="room-legend__item room-legend__item--fault">⚠️ Fault / Critical</span>
        <span className="room-legend__item room-legend__item--isolated">🔒 Isolated</span>
        <span className="room-legend__item room-legend__item--blocked">⛔ Flow Blocked</span>
      </div>

      {/* ── M27 Spotlight ── */}
      <section className="cascade-spotlight">
        <h2 className="cascade-spotlight__title">🎯 Machine M27 — Cascade Isolation Control</h2>
        <div className="cascade-spotlight__body">
          <div className="cascade-spotlight__left">
            <div className="cascade-spotlight__label">What happens when M27 has an issue?</div>
            <ul className="cascade-spotlight__list">
              <li>🔴 M27 risk score rises above <strong>85/100</strong></li>
              <li>🤖 Automation loop detects critical risk (polls every 30s)</li>
              <li>🔒 M27 is <strong>automatically isolated</strong> — output feed cut</li>
              <li>⛔ Downstream <strong>M28, M29, M30</strong> — input halted safely</li>
              <li>🚨 Pre-failure alerts at 72h / 48h / 24h / 12h / 6h / 1h</li>
              <li>👷 Best available technician auto-assigned to M27</li>
              <li>📋 Work order auto-created for next maintenance slot</li>
              <li>📧 Email + Slack notifications sent to team</li>
            </ul>
          </div>
          <div className="cascade-spotlight__right">
            {/* Inline flow diagram */}
            <div className="cascade-flow-diagram">
              {['M25','M26','M27','M28','M29','M30'].map((id, i) => {
                const s = getS(id);
                const isFault = id === FAULT_MACHINE;
                const isDown = DOWNSTREAM_OF_FAULT.includes(id);
                const isBlk = faultIsolated && isDown;
                return (
                  <React.Fragment key={id}>
                    <div className={`cfd-node ${isFault ? (faultIsolated ? 'cfd-node--isolated' : 'cfd-node--fault') : isBlk ? 'cfd-node--blocked' : s.isIsolated ? 'cfd-node--isolated' : 'cfd-node--ok'}`}>
                      <div className="cfd-node__id">{id}</div>
                      <div className="cfd-node__label">
                        {isFault ? (faultIsolated ? '🔒 Isolated' : '⚠️ FAULT') : isBlk ? '⛔ Blocked' : '✅ OK'}
                      </div>
                    </div>
                    {i < 5 && (
                      <div className={`cfd-arrow ${i === 2 && faultIsolated ? 'cfd-arrow--cut' : ''}`}>
                        {i === 2 && faultIsolated ? '⛔' : '→'}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="cascade-spotlight__flow-label">
              Flow: M25 → M26 → [M27 ⚠️] {faultIsolated ? '⛔ CUT' : '→'} M28 → M29 → M30
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              {faultIsolated ? (
                <button
                  className="cascade-spotlight__btn cascade-spotlight__btn--release"
                  disabled={actionLoading === FAULT_MACHINE}
                  onClick={() => handleRelease(FAULT_MACHINE)}
                >
                  {actionLoading === FAULT_MACHINE ? '⏳ Processing…' : '🔓 Release M27 from Isolation'}
                </button>
              ) : (
                <button
                  className="cascade-spotlight__btn cascade-spotlight__btn--isolate"
                  disabled={actionLoading === FAULT_MACHINE}
                  onClick={() => handleIsolate(FAULT_MACHINE)}
                >
                  {actionLoading === FAULT_MACHINE ? '⏳ Processing…' : '🔒 Isolate M27 — Protect M28/M29/M30'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 36-machine room — line by line ── */}
      <section className="room-section">
        <h2 className="room-section__title">🗺️ Factory Floor Room 1 — All 36 Machines</h2>
        <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 16 }}>
          Click a line header to expand/collapse. Arrows show production flow — ⛔ means flow is cut.
        </p>

        {LINES.map((line, lineIdx) => {
          const lineIsolated = line.ids.filter((id) => getS(id).isIsolated).length;
          const lineBlocked = line.ids.filter((id) => isBlocked(id)).length;
          const faultInLine = line.ids.includes(FAULT_MACHINE);
          const isExpanded = expandedLine === null || expandedLine === lineIdx;

          return (
            <div
              key={lineIdx}
              className={`room-line ${faultInLine ? 'room-line--fault-zone' : ''}`}
              style={{ borderLeftColor: line.color }}
            >
              <div
                className="room-line__header"
                onClick={() => setExpandedLine(isExpanded && expandedLine === lineIdx ? null : lineIdx)}
              >
                <div className="room-line__header-left">
                  <span style={{ fontSize: 20 }}>{line.icon}</span>
                  <span className="room-line__label" style={{ color: line.color }}>{line.label}</span>
                  <span className="room-line__zone">{line.zone}</span>
                  <span className="room-line__count">{line.ids.length} machines</span>
                </div>
                <div className="room-line__header-right">
                  {lineIsolated > 0 && <span className="room-line__badge room-line__badge--isolated">🔒 {lineIsolated}</span>}
                  {lineBlocked > 0 && <span className="room-line__badge room-line__badge--blocked">⛔ {lineBlocked} blocked</span>}
                  {faultInLine && <span className="room-line__badge room-line__badge--fault">⚠️ FAULT ZONE</span>}
                  <span className="room-line__toggle">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="room-line__flow">
                  {line.ids.map((id, pos) => {
                    const s = getS(id);
                    const blocked = isBlocked(id);
                    const isFaultMachine = id === FAULT_MACHINE;
                    const isLast = pos === line.ids.length - 1;
                    const nextId = line.ids[pos + 1];
                    const cutAfter = isFaultMachine && faultIsolated;
                    const cutBefore = nextId && DOWNSTREAM_OF_FAULT.includes(nextId) && faultIsolated;

                    return (
                      <React.Fragment key={id}>
                        <div className={`room-cell ${getCellClass(id)}`}>
                          {s.isIsolated && <div className="room-cell__badge room-cell__badge--isolated">🔒</div>}
                          {blocked && !s.isIsolated && <div className="room-cell__badge room-cell__badge--blocked">⛔</div>}
                          {isFaultMachine && !s.isIsolated && <div className="room-cell__badge room-cell__badge--fault-pulse">⚠️</div>}

                          <div className="room-cell__id">{id}</div>
                          <div className="room-cell__name">{s.machineName !== id ? s.machineName : id}</div>

                          <div className={`room-cell__state ${
                            s.isIsolated ? 'room-cell__state--isolated'
                            : blocked ? 'room-cell__state--blocked'
                            : 'room-cell__state--online'
                          }`}>
                            {s.isIsolated ? 'ISOLATED' : blocked ? 'BLOCKED' : 'ONLINE'}
                          </div>

                          {(isFaultMachine || s.isIsolated) && (
                            <button
                              className={`room-cell__btn ${s.isIsolated ? 'room-cell__btn--release' : 'room-cell__btn--isolate'}`}
                              disabled={actionLoading === id}
                              onClick={(e) => { e.stopPropagation(); s.isIsolated ? handleRelease(id) : handleIsolate(id); }}
                            >
                              {actionLoading === id ? '⏳' : s.isIsolated ? '🔓' : '🔒 Cut'}
                            </button>
                          )}
                        </div>

                        {!isLast && (
                          <div className={`room-flow-arrow ${cutAfter || cutBefore ? 'room-flow-arrow--cut' : ''}`}>
                            {cutAfter || cutBefore ? '⛔' : '→'}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Isolation History */}
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
                    <span>Risk: {h.riskScoreAtIsolation.toFixed(0)}%</span>
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
