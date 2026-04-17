import React, { useState, useMemo } from 'react';
import { useHistoricalData } from '../../../hooks/useHistoricalData';
import { SensorChartPanel, CombinedChartPanel } from '../charts';
import {
  SENSOR_CONFIG,
  KNOWN_SENSOR_TYPES,
  type KnownSensorType,
  type SensorChartPoint,
  getSensorTypeFromId,
  buildCombinedHistoryData,
} from '../charts/chartConfig';

/* ── Time preset helper ─────────────────────────────────── */
interface Preset {
  label: string;
  minutes: number;
}

const PRESETS: Preset[] = [
  { label: '15 m', minutes: 15 },
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

/* ── CSV export ─────────────────────────────────────────── */
const exportCsv = (
  histories: Array<{ sensorId: string; data: Array<{ timestamp: string; value: number }> }>,
  machineId: string,
) => {
  if (!histories.length) return;

  // Build a combined row per timestamp
  const typeMap = new Map<
    KnownSensorType,
    Array<{ timestamp: string; value: number }>
  >();
  for (const h of histories) {
    const type = getSensorTypeFromId(h.sensorId);
    if (type) typeMap.set(type, h.data);
  }

  const maxLen = Math.max(...[...typeMap.values()].map((d) => d.length), 0);
  const rows: string[] = ['timestamp,temperature_C,vibration_mm_s,rpm,current_A'];
  for (let i = 0; i < maxLen; i++) {
    const ts = typeMap.get('temperature')?.[i]?.timestamp ?? '';
    const cols = KNOWN_SENSOR_TYPES.map(
      (t) => typeMap.get(t)?.[i]?.value?.toFixed(3) ?? '',
    );
    rows.push([ts, ...cols].join(','));
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${machineId}_sensor_history_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ── Main component ─────────────────────────────────────── */
interface HistoryViewProps {
  machineId: string;
  machineName?: string;
}

const HistoryView: React.FC<HistoryViewProps> = ({ machineId, machineName }) => {
  const [activePreset, setActivePreset] = useState<number>(1440); // 24h default
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const range = useMemo(() => {
    if (useCustom && customFrom && customTo) return { from: customFrom, to: customTo };
    return makeRange(activePreset);
  }, [activePreset, useCustom, customFrom, customTo]);

  const { data: histories, isLoading, isError } = useHistoricalData(machineId, range);

  /* Per-type chart data */
  const chartDataByType = useMemo<Record<KnownSensorType, SensorChartPoint[]>>(() => {
    const map = {} as Record<KnownSensorType, SensorChartPoint[]>;
    for (const type of KNOWN_SENSOR_TYPES) {
      const hist = histories?.find((h) => getSensorTypeFromId(h.sensorId) === type);
      map[type] = hist ? hist.data.map((d) => ({ timestamp: d.timestamp, value: d.value })) : [];
    }
    return map;
  }, [histories]);

  /* Combined chart data */
  const combinedData = useMemo(
    () => buildCombinedHistoryData(histories ?? []),
    [histories],
  );

  const dataPoints = histories?.[0]?.data.length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    flexWrap: 'wrap', gap: 12 }}>
        {/* Preset buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESETS.map((p) => (
              <button
                key={p.minutes}
                onClick={() => { setActivePreset(p.minutes); setUseCustom(false); }}
                style={{
                  padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: !useCustom && activePreset === p.minutes
                    ? 'var(--color-primary)' : 'none',
                  color: !useCustom && activePreset === p.minutes
                    ? '#fff' : 'var(--color-text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom range */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Custom:</label>
            <input
              type="datetime-local"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{ padding: '4px 8px', fontSize: 12, border: '1px solid var(--color-border)',
                       borderRadius: 6 }}
            />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>→</span>
            <input
              type="datetime-local"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{ padding: '4px 8px', fontSize: 12, border: '1px solid var(--color-border)',
                       borderRadius: 6 }}
            />
            <button
              onClick={() => { if (customFrom && customTo) setUseCustom(true); }}
              disabled={!customFrom || !customTo}
              style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6,
                       border: '1px solid var(--color-primary)', background: 'none',
                       color: 'var(--color-primary)', cursor: 'pointer' }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Right side: info + export */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {!isLoading && dataPoints > 0 && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {dataPoints.toLocaleString()} data points
            </span>
          )}
          <button
            onClick={() => histories && exportCsv(histories, machineName ?? machineId)}
            disabled={!histories?.length}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              border: '1px solid var(--color-border)', borderRadius: 8,
              background: 'none', cursor: 'pointer',
              color: histories?.length ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              opacity: histories?.length ? 1 : 0.5,
            }}
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', borderRadius: 8,
                      color: '#ef4444', fontSize: 13 }}>
          Failed to load historical data. Ensure the simulation server is running.
        </div>
      )}

      {/* 2 × 2 individual sensor charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                    gap: 16 }}>
        {KNOWN_SENSOR_TYPES.map((type) => (
          <SensorChartPanel
            key={type}
            type={type}
            data={chartDataByType[type]}
            mode="history"
            height={240}
            showBrush
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Combined overview */}
      <CombinedChartPanel
        data={combinedData}
        mode="history"
        height={300}
        showBrush
        isLoading={isLoading}
      />

      {/* Legend for threshold lines */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11,
                    color: 'var(--color-text-muted)', paddingLeft: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 20, height: 2,
                         background: '#f59e0b', borderTop: '2px dashed #f59e0b' }} />
          Warning threshold
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 20, height: 2,
                         background: '#ef4444', borderTop: '2px dashed #ef4444' }} />
          Critical threshold
        </span>
        {KNOWN_SENSOR_TYPES.map((t) => (
          <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                           background: SENSOR_CONFIG[t].color }} />
            {SENSOR_CONFIG[t].label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default HistoryView;
