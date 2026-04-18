import React, { useState, useMemo } from 'react';
import { useHistoricalData } from '../../../hooks/useHistoricalData';
import { useBaseline } from '../../../hooks/useBaseline';
import { SensorChartPanel } from '../charts/SensorChart';
import { CombinedChartPanel } from '../charts/CombinedChart';
import {
  SENSOR_CONFIG, KNOWN_SENSOR_TYPES, type KnownSensorType,
  type SensorChartPoint, type SensorThresholds,
  buildCombinedHistoryData,
} from '../charts/chartConfig';

interface Preset { label: string; minutes: number; }

const PRESETS: Preset[] = [
  { label: '1 h', minutes: 60 },
  { label: '6 h', minutes: 360 },
  { label: '24 h', minutes: 1440 },
  { label: '3 d', minutes: 4320 },
  { label: '7 d', minutes: 10080 },
];

const makeRange = (minutes: number) => {
  const to = new Date();
  const from = new Date(to.getTime() - minutes * 60 * 1000);
  return { from: from.toISOString().slice(0, 16), to: to.toISOString().slice(0, 16) };
};

interface Props { machineId: string; machineName?: string; }

const HistoryView: React.FC<Props> = ({ machineId, machineName }) => {
  const [activePreset, setActivePreset] = useState(1440);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const range = useMemo(() => {
    if (useCustom && customFrom && customTo) return { from: customFrom, to: customTo };
    return makeRange(activePreset);
  }, [activePreset, useCustom, customFrom, customTo]);

  const { data: histories, isLoading, isError } = useHistoricalData(machineId, range);
  const { baseline, isLoading: baselineLoading, overallHealth } = useBaseline(machineId);

  const chartDataByType = useMemo<Record<KnownSensorType, SensorChartPoint[]>>(() => {
    const map = {} as Record<KnownSensorType, SensorChartPoint[]>;
    for (const type of KNOWN_SENSOR_TYPES) {
      const hist = histories?.find((h) => h.type === type);
      map[type] = hist ? hist.data.map((d) => ({ timestamp: d.timestamp, value: d.value })) : [];
    }
    return map;
  }, [histories]);

  const thresholdsByType = useMemo<Record<KnownSensorType, SensorThresholds | undefined>>(() => {
    const map = {} as Record<KnownSensorType, SensorThresholds | undefined>;
    for (const type of KNOWN_SENSOR_TYPES) {
      const bl = baseline?.sensors[type];
      map[type] = bl
        ? { warningMin: bl.warningMin, warningMax: bl.warningMax,
            criticalMin: bl.criticalMin, criticalMax: bl.criticalMax,
            mean: bl.mean, trend: bl.trend, trendPct: bl.trendPct }
        : undefined;
    }
    return map;
  }, [baseline]);

  const combinedData = useMemo(() => buildCombinedHistoryData(histories ?? []), [histories]);
  const dataPoints = histories?.[0]?.data.length ?? 0;

  const healthColor = overallHealth === null ? '#6b7280'
    : overallHealth >= 80 ? '#16a34a' : overallHealth >= 60 ? '#d97706' : '#ef4444';
  const healthBg = overallHealth === null ? '#f3f4f6'
    : overallHealth >= 80 ? '#f0fdf4' : overallHealth >= 60 ? '#fffbeb' : '#fee2e2';

  const exportCsv = () => {
    if (!histories?.length) return;
    const typeMap = new Map<KnownSensorType, Array<{ timestamp: string; value: number }>>();
    for (const h of histories) {
      const t = h.type as KnownSensorType;
      if (KNOWN_SENSOR_TYPES.includes(t)) typeMap.set(t, h.data);
    }
    const maxLen = Math.max(...[...typeMap.values()].map((d) => d.length), 0);
    const rows = ['timestamp,temperature_C,vibration_mm_s,rpm,current_A'];
    for (let i = 0; i < maxLen; i++) {
      const ts = typeMap.get('temperature')?.[i]?.timestamp ?? '';
      const cols = KNOWN_SENSOR_TYPES.map((t) => typeMap.get(t)?.[i]?.value?.toFixed(3) ?? '');
      rows.push([ts, ...cols].join(','));
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    a.download = `${machineId}_history_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESETS.map((p) => (
              <button key={p.minutes}
                onClick={() => { setActivePreset(p.minutes); setUseCustom(false); }}
                style={{
                  padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8,
                  border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s',
                  background: !useCustom && activePreset === p.minutes ? '#3b82f6' : 'none',
                  color: !useCustom && activePreset === p.minutes ? '#fff' : '#64748b',
                }}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>Custom:</label>
            <input type="datetime-local" value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6 }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>→</span>
            <input type="datetime-local" value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6 }} />
            <button
              onClick={() => { if (customFrom && customTo) setUseCustom(true); }}
              disabled={!customFrom || !customTo}
              style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #3b82f6',
                       background: 'none', color: '#3b82f6', cursor: 'pointer' }}>
              Apply
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {overallHealth !== null && !baselineLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                          background: healthBg, borderRadius: 10, padding: '4px 12px' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: healthColor }}>
                {overallHealth >= 80 ? '✓' : overallHealth >= 60 ? '⚠' : '✗'} Health {overallHealth}%
              </span>
            </div>
          )}
          {!isLoading && dataPoints > 0 && (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{dataPoints.toLocaleString()} pts</span>
          )}
          <button onClick={exportCsv} disabled={!histories?.length}
            style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600,
                     border: '1px solid #e2e8f0', borderRadius: 8, background: 'none',
                     cursor: 'pointer', opacity: histories?.length ? 1 : 0.5 }}>
            ↓ CSV
          </button>
        </div>
      </div>

      {isError && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', borderRadius: 8,
                      color: '#ef4444', fontSize: 13 }}>
          Failed to load history. Ensure the simulation server is running.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
        {KNOWN_SENSOR_TYPES.map((type) => (
          <SensorChartPanel key={type} type={type} data={chartDataByType[type]}
            mode="history" height={320} showBrush thresholds={thresholdsByType[type]}
            isLoading={isLoading || baselineLoading} />
        ))}
      </div>

      <CombinedChartPanel data={combinedData} mode="history" height={420} isLoading={isLoading} />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: '#94a3b8', paddingLeft: 4 }}>
        {KNOWN_SENSOR_TYPES.map((t) => (
          <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%',
                           background: SENSOR_CONFIG[t].color, display: 'inline-block' }} />
            {SENSOR_CONFIG[t].label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default HistoryView;
