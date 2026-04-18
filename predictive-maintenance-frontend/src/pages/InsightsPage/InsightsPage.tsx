import React, { useState, useEffect, useCallback } from 'react';
import { insightsApi } from '../../services/api/insightsApi';
import { Skeleton, MachineCardSkeleton, AnalysisPanelSkeleton } from '../../components/common/Skeleton';
import { jsPDF } from 'jspdf';

const MACHINES = [
  { id: 'CNC_01',      label: 'CNC Mill 01',        icon: '⚙' },
  { id: 'CNC_02',      label: 'CNC Lathe 02',       icon: '🔧' },
  { id: 'PUMP_03',     label: 'Industrial Pump 03', icon: '💧' },
  { id: 'CONVEYOR_04', label: 'Conveyor Belt 04',   icon: '📦' },
];

const PHASE_ICONS = ['✓', '⚡', '⚠', '🔴'];

// ── Helpers ──────────────────────────────────────────────────────────────────

const PhaseBar: React.FC<{ phase: number; pct: number }> = ({ phase, pct }) => {
  const colors = ['#22c55e', '#f59e0b', '#f97316', '#ef4444'];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
        <span>Healthy</span><span>Fault</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%', borderRadius: 4, transition: 'width 0.6s ease',
          width: `${Math.max(2, pct)}%`,
          background: `linear-gradient(90deg, #22c55e, ${colors[phase]})`,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
        {['Phase 0', 'Phase 1', 'Phase 2', 'Phase 3'].map((p, i) => (
          <span key={i} style={{ color: i === phase ? colors[i] : undefined, fontWeight: i === phase ? 700 : 400 }}>{p}</span>
        ))}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: string }> = ({ label, value, sub, color }) => (
  <div style={{ background: 'var(--color-surface-alt,#f8fafc)', borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 120 }}>
    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--color-text,#111)', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
  </div>
);

function corrColor(v: number): string {
  if (v >= 0.7)  return '#16a34a';
  if (v >= 0.4)  return '#65a30d';
  if (v >= 0.1)  return '#ca8a04';
  if (v >= -0.1) return '#9ca3af';
  if (v >= -0.4) return '#ea580c';
  return '#dc2626';
}

// ── Main component ────────────────────────────────────────────────────────────

const InsightsPage: React.FC = () => {
  const [overview, setOverview] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('CNC_01');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load overview on mount
  useEffect(() => {
    insightsApi.getOverview()
      .then(r => setOverview(r.data?.data ?? []))
      .catch(() => setError('Could not load overview — ensure backend and simulation server are running.'))
      .finally(() => setOverviewLoading(false));
  }, []);

  const loadAnalysis = useCallback((machineId: string) => {
    setLoading(true);
    setAnalysis(null);
    setError(null);
    insightsApi.getAnalysis(machineId)
      .then(r => setAnalysis(r.data?.data))
      .catch(() => setError('Analysis failed — check simulation server connection.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAnalysis(selected); }, [selected, loadAnalysis]);

  const phase = analysis?.phase;
  const corr  = analysis?.correlation;
  const roi   = analysis?.roi;
  const wins  = analysis?.windows;
  const tod   = analysis?.time_of_day;
  const report = analysis?.report;

  const ov = overview.find(o => o.machine_id === selected);

  /* ── PDF Export ────────────────────────────────────────────────────── */
  const exportPdf = useCallback(() => {
    if (!report || !phase) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    let y = 40;
    const lineH = 16;

    const addLine = (text: string, opts?: { bold?: boolean; color?: [number, number, number]; size?: number }) => {
      doc.setFontSize(opts?.size ?? 11);
      doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
      if (opts?.color) doc.setTextColor(...opts.color); else doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(text, w - 80);
      for (const line of lines) {
        if (y > 780) { doc.addPage(); y = 40; }
        doc.text(line, 40, y);
        y += lineH;
      }
    };

    // Title
    addLine('AI INCIDENT ANALYSIS REPORT', { bold: true, size: 18, color: [26, 86, 219] });
    y += 6;
    addLine(`Machine: ${report.machine_name}`, { size: 12 });
    addLine(`Generated: ${new Date(report.generated_at).toLocaleString()}`, { size: 10, color: [120, 120, 120] });
    addLine(`Phase: ${report.phase} — ${report.phase_name}`, { bold: true, size: 13, color: phase.phase === 0 ? [34, 197, 94] : phase.phase === 3 ? [239, 68, 68] : [249, 115, 22] });
    y += 12;

    // Executive Summary
    addLine('EXECUTIVE SUMMARY', { bold: true, size: 13 });
    addLine(report.executive_summary?.replace(/\*\*/g, '') ?? '');
    y += 10;

    // Sensor Analysis
    if (report.sensor_analysis?.length) {
      addLine('SENSOR READINGS', { bold: true, size: 13 });
      report.sensor_analysis.forEach((line: string) => addLine(`  • ${line}`, { size: 10 }));
      y += 10;
    }

    // Recommendations
    if (report.recommendations?.length) {
      addLine('RECOMMENDED ACTIONS', { bold: true, size: 13 });
      report.recommendations.forEach((rec: string, i: number) => addLine(`  ${i + 1}. ${rec}`, { size: 10 }));
      y += 10;
    }

    // ROI
    if (roi) {
      addLine('COST IMPACT', { bold: true, size: 13 });
      addLine(`  Total Early Detection Value: ${roi.detection_value}`, { bold: true, color: [22, 163, 74] });
      addLine(`  Downtime saved: ${roi.unplanned_downtime_hours}h ($${roi.downtime_cost_saved?.toLocaleString()})`, { size: 10 });
      addLine(`  Repair cost saved: $${roi.repair_cost_saved?.toLocaleString()}`, { size: 10 });
      addLine(`  Production units saved: ${roi.production_units_saved?.toLocaleString()}`, { size: 10 });
      y += 10;
    }

    // Correlation notes
    if (report.correlation_notes) {
      addLine('CORRELATION NOTES', { bold: true, size: 13 });
      addLine(report.correlation_notes, { size: 10 });
    }

    // Footer
    y += 20;
    addLine(`Report ID: ${report.machine_id}-${Date.now()}`, { size: 9, color: [160, 160, 160] });
    addLine('Generated by PredictiveAI Intelligence Center', { size: 9, color: [160, 160, 160] });

    doc.save(`incident-report-${report.machine_id}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [report, phase, roi]);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1280, margin: '0 auto', color: 'var(--color-text,#111)' }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            AI Intelligence Center
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
            Failure phase fingerprinting · Sensor correlation · Predictive ROI · Shift-aware risk calendar · Maintenance windows
          </p>
        </div>
        <button onClick={() => loadAnalysis(selected)} disabled={loading} style={{
          padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0',
          background: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
        }}>
          {loading ? '⟳ Refreshing…' : '⟳ Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#b91c1c' }}>
          ⚠ {error}
        </div>
      )}

      {/* Machine Fleet Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
        {MACHINES.map(m => {
          const ov = overviewLoading ? null : overview.find(o => o.machine_id === m.id);
          const p = ov?.phase;
          const colors = ['#22c55e', '#f59e0b', '#f97316', '#ef4444'];
          const pColor = p ? colors[p.phase] : '#6b7280';
          const isActive = selected === m.id;
          return (
            <div key={m.id} onClick={() => setSelected(m.id)} style={{
              borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
              border: `2px solid ${isActive ? pColor : 'var(--color-border,#e2e8f0)'}`,
              background: isActive ? `${pColor}10` : 'var(--color-surface,#fff)',
              transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{m.icon} {m.label}</span>
                {p && <span style={{
                  background: pColor, color: '#fff', borderRadius: 20, padding: '2px 10px',
                  fontSize: 11, fontWeight: 700,
                }}>{PHASE_ICONS[p.phase]} {p.phase_name}</span>}
              </div>
              {p ? (
                <>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                    {p.failure_mode}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4, color: pColor, fontWeight: 600 }}>
                    {p.rul_hours != null ? `~${p.rul_hours}h remaining` : 'Healthy'}
                  </div>
                  {ov?.roi?.detection_value && p.phase >= 1 && (
                    <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                      Saves {ov.roi.detection_value}
                    </div>
                  )}
                  {ov?.time_of_day?.now_in_risk_window && (
                    <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 700, marginTop: 3 }}>
                      🔴 In peak risk window now
                    </div>
                  )}
                  <PhaseBar phase={p.phase} pct={p.pct_to_fault} />
                </>
              ) : overviewLoading ? (
                <>
                  <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: 8 }} />
                  <Skeleton width="70%" height={10} style={{ marginTop: 6 }} />
                </>
              ) : (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>No data</div>
              )}
            </div>
          );
        })}
      </div>

      {loading && <AnalysisPanelSkeleton />}

      {!loading && analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Row 1: Phase detail + ROI */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

            {/* Failure Phase Detail */}
            {phase && (
              <div style={{ borderRadius: 14, border: `2px solid ${phase.phase_color}`, padding: '20px 24px', background: `${phase.phase_color}08` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Failure Mode Fingerprint
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{phase.failure_mode}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{phase.machine_name}</div>
                  </div>
                  <div style={{
                    background: phase.phase_color, color: '#fff', borderRadius: 12,
                    padding: '8px 18px', textAlign: 'center', minWidth: 110,
                  }}>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>Current Phase</div>
                    <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>Phase {phase.phase}</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{phase.phase_name}</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#475569', marginBottom: 14, lineHeight: 1.6 }}>
                  {phase.phase_description}
                </div>

                <PhaseBar phase={phase.phase} pct={phase.pct_to_fault} />

                <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <StatCard label="RUL Estimate" value={phase.rul_hours != null ? `${phase.rul_hours}h` : '—'} sub="Remaining Useful Life" color={phase.phase_color} />
                  <StatCard label="% to Fault" value={`${phase.pct_to_fault}%`} sub="degradation progress" color={phase.pct_to_fault > 60 ? '#ef4444' : '#f59e0b'} />
                  <StatCard label="Trend" value={phase.trend === 'worsening' ? '↑' : phase.trend === 'improving' ? '↓' : '→'} sub={phase.trend} color={phase.trend === 'worsening' ? '#ef4444' : '#22c55e'} />
                  <StatCard label="Key Sensor" value={`${phase.key_value ?? '—'}`} sub={`${phase.key_sensor} (baseline ${phase.key_baseline})`} />
                </div>

                {/* Sensor deltas table */}
                {phase.sensor_deltas && Object.keys(phase.sensor_deltas).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                      Sensor Analysis
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                      {Object.entries(phase.sensor_deltas).map(([, sd]: [string, any]) => {
                        const elevated = Math.abs(sd.pct_change) > 10;
                        const sign = sd.delta >= 0 ? '+' : '';
                        return (
                          <div key={sd.label} style={{
                            background: elevated ? '#fff7ed' : 'var(--color-surface-alt,#f8fafc)',
                            border: `1px solid ${elevated ? '#fed7aa' : '#e2e8f0'}`,
                            borderRadius: 8, padding: '8px 12px',
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>{sd.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: elevated ? '#ea580c' : 'inherit' }}>
                              {sd.current} <span style={{ fontSize: 11, color: '#94a3b8' }}>{sd.unit}</span>
                            </div>
                            <div style={{ fontSize: 11, color: elevated ? '#ea580c' : '#94a3b8' }}>
                              {sign}{sd.delta} ({sign}{sd.pct_change}%) vs baseline
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ROI Card */}
            {roi && (
              <div style={{ borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '20px 24px', background: 'var(--color-surface,#fff)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Early Detection Value
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>
                  {roi.detection_value}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 16 }}>
                  total estimated savings vs run-to-failure
                </div>

                {[
                  { label: 'Downtime avoided', value: `${roi.unplanned_downtime_hours}h × $${roi.downtime_cost_per_hour?.toLocaleString()}/h`, amount: `$${roi.downtime_cost_saved?.toLocaleString()}` },
                  { label: 'Emergency repair avoided', value: `$${roi.emergency_repair_cost?.toLocaleString()} → $${roi.planned_maintenance_cost?.toLocaleString()}`, amount: `$${roi.repair_cost_saved?.toLocaleString()}` },
                  { label: 'Production units saved', value: 'avoided lost output', amount: `${roi.production_units_saved?.toLocaleString()} units` },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{row.label}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{row.value}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{row.amount}</div>
                  </div>
                ))}

                <div style={{ marginTop: 16, background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#15803d', lineHeight: 1.5 }}>
                  <strong>Phase {roi.phase} detection</strong> — acting now costs ${roi.planned_maintenance_cost?.toLocaleString()} (planned). Waiting until fault costs ${roi.emergency_repair_cost?.toLocaleString()} + {roi.unplanned_downtime_hours}h downtime.
                </div>
              </div>
            )}
          </div>

          {/* Time-of-Day Risk Window Banner */}
          {tod?.available && (
            <div style={{
              borderRadius: 14,
              border: `2px solid ${tod.now_in_risk_window ? '#ef4444' : tod.now_in_safe_window ? '#22c55e' : '#f59e0b'}`,
              padding: '18px 24px',
              background: tod.now_in_risk_window ? '#fef2f2' : tod.now_in_safe_window ? '#f0fdf4' : '#fffbeb',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Shift-Aware Risk Calendar
                  </div>
                  <div style={{
                    fontSize: 15, fontWeight: 800,
                    color: tod.now_in_risk_window ? '#dc2626' : tod.now_in_safe_window ? '#16a34a' : '#b45309',
                    marginBottom: 6,
                  }}>
                    {tod.now_in_risk_window ? '🔴 ACTIVE RISK WINDOW' : tod.now_in_safe_window ? '🟢 SAFE MAINTENANCE WINDOW NOW' : `⚡ Next risk window in ${tod.hours_to_next_risk}h`}
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{tod.alert}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ borderRadius: 10, background: '#fee2e2', padding: '10px 16px', minWidth: 140 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: 2 }}>Peak Risk Window</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>{tod.peak_risk_window}</div>
                    <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4, lineHeight: 1.4 }}>{tod.peak_risk_reason}</div>
                  </div>
                  <div style={{ borderRadius: 10, background: '#dcfce7', padding: '10px 16px', minWidth: 140 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: 2 }}>Safest Maintenance Slot</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{tod.safe_window}</div>
                    <div style={{ fontSize: 11, color: '#166534', marginTop: 4, lineHeight: 1.4 }}>{tod.safe_window_reason}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Row 2: Correlation Heatmap + Maintenance Windows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>

            {/* Correlation Heatmap */}
            {corr && (
              <div style={{ borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Sensor Correlation Matrix
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                  How sensors move together — broken correlations indicate unusual failure modes
                </div>

                <div style={{ overflowX: 'auto' }}>
                  {(() => {
                    const sensors = Object.keys(corr.matrix);
                    return (
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, color: '#94a3b8', fontSize: 11 }}></th>
                            {sensors.map(s => <th key={s} style={{ padding: '4px 8px', fontWeight: 600, fontSize: 11, color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>{s}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {sensors.map(row => (
                            <tr key={row}>
                              <td style={{ padding: '4px 8px', fontWeight: 600, fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{row}</td>
                              {sensors.map(col => {
                                const v: number = corr.matrix[row]?.[col] ?? 0;
                                const bg = v === 1 ? '#f0fdf4' : `${corrColor(v)}22`;
                                return (
                                  <td key={col} style={{
                                    padding: '8px 12px', textAlign: 'center', borderRadius: 6,
                                    background: bg, fontWeight: v === 1 ? 400 : 700,
                                    color: v === 1 ? '#94a3b8' : corrColor(v),
                                    fontSize: 13,
                                  }}>
                                    {v === 1 ? '—' : v.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', fontSize: 11, color: '#94a3b8' }}>
                  {[['#16a34a', 'Strong +ve'], ['#ca8a04', 'Weak'], ['#dc2626', 'Negative']].map(([c, l]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
                    </span>
                  ))}
                </div>

                {corr.anomalies?.length > 0 && (
                  <div style={{ marginTop: 14, background: '#fff7ed', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', marginBottom: 6 }}>
                      ⚠ Anomalous Correlations Detected
                    </div>
                    {corr.anomalies.map((a: string, i: number) => (
                      <div key={i} style={{ fontSize: 12, color: '#92400e', marginBottom: 3 }}>• {a}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Maintenance Windows */}
            {wins && (
              <div style={{ borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Optimal Maintenance Windows
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                  Based on failure trajectory + shift patterns
                </div>

                {wins.projected_fault_at && (
                  <div style={{ background: '#fee2e2', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12 }}>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>Projected fault: </span>
                    <span style={{ color: '#7f1d1d' }}>
                      {new Date(wins.projected_fault_at).toLocaleString()} UTC
                      {wins.rul_hours != null ? ` (~${wins.rul_hours}h)` : ''}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {wins.windows?.map((w: any, i: number) => {
                    const urgencyColors: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };
                    const c = urgencyColors[w.urgency] || '#6b7280';
                    return (
                      <div key={i} style={{
                        borderRadius: 10, border: `1.5px solid ${c}40`,
                        background: `${c}08`, padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{i + 1}. {w.label}</span>
                          <span style={{ fontSize: 10, background: c, color: '#fff', borderRadius: 20, padding: '2px 8px', fontWeight: 700, textTransform: 'uppercase' }}>
                            {w.urgency}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: c }}>{w.slot_display}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{w.reason}</div>
                        {w.warning && (
                          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, fontWeight: 600 }}>⚠ May be too late — prefer Window 1</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Row 3: AI Incident Report */}
          {report && (
            <div style={{ borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    AI Incident Analysis Report
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Generated {new Date(report.generated_at).toLocaleString()} · {report.machine_name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ background: report.phase_color, color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700 }}>
                    Phase {report.phase} — {report.phase_name}
                  </span>
                  <button onClick={exportPdf} style={{
                    padding: '6px 14px', borderRadius: 8, border: '1.5px solid #1a56db',
                    background: 'rgba(26,86,219,0.06)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    color: '#1a56db', display: 'flex', alignItems: 'center', gap: 4,
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#1a56db'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(26,86,219,0.06)'; e.currentTarget.style.color = '#1a56db'; }}
                  >
                    📄 Export PDF
                  </button>
                  <button onClick={() => setReportOpen(!reportOpen)} style={{
                    padding: '6px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                    background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>
                    {reportOpen ? '▲ Collapse' : '▼ Expand'}
                  </button>
                </div>
              </div>

              {/* Executive Summary always visible */}
              <div style={{
                background: `${report.phase_color}10`, border: `1px solid ${report.phase_color}30`,
                borderRadius: 10, padding: '14px 18px', fontSize: 13, lineHeight: 1.7, marginBottom: reportOpen ? 16 : 0,
              }}>
                <strong>Executive Summary — </strong>
                {report.executive_summary?.replace(/\*\*/g, '')}
              </div>

              {reportOpen && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>

                  {/* Sensor Analysis */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                      SENSOR READINGS
                    </div>
                    {report.sensor_analysis?.map((line: string, i: number) => (
                      <div key={i} style={{ fontSize: 12, padding: '5px 0', borderBottom: '1px solid #f1f5f9', color: line.includes('ELEVATED') ? '#ea580c' : 'inherit' }}>
                        {line}
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                      RECOMMENDED ACTIONS
                    </div>
                    {report.recommendations?.map((rec: string, i: number) => (
                      <div key={i} style={{
                        fontSize: 12, padding: '6px 10px', marginBottom: 6, borderRadius: 6,
                        background: rec.startsWith('⛔') ? '#fee2e2' : '#f8fafc',
                        border: rec.startsWith('⛔') ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                        fontWeight: rec.startsWith('⛔') ? 700 : 400,
                        color: rec.startsWith('⛔') ? '#dc2626' : 'inherit',
                      }}>
                        {i + 1}. {rec}
                      </div>
                    ))}
                  </div>

                  {/* Correlation Notes + Cost Impact — full width */}
                  <div style={{ gridColumn: '1 / -1', background: '#f8fafc', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>CORRELATION NOTES</div>
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>{report.correlation_notes}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>COST IMPACT</div>
                    <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>{report.cost_impact}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Automated Sim-Server Reporting Notice */}
          {phase && phase.phase >= 2 && (
            <div style={{
              borderRadius: 10, border: '1px solid #a7f3d0', background: '#ecfdf5',
              padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
            }}>
              <span style={{ fontSize: 18 }}>🔁</span>
              <div>
                <strong style={{ color: '#065f46' }}>Auto-Reported to Simulation Server</strong>
                <div style={{ color: '#047857', fontSize: 12, marginTop: 2 }}>
                  This Phase {phase.phase} ({phase.phase_name}) alert has been automatically POSTed to{' '}
                  <code style={{ background: '#d1fae5', padding: '1px 6px', borderRadius: 4 }}>
                    /alert
                  </code>{' '}
                  on the simulation API — closing the feedback loop.
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default InsightsPage;
