import React, { useState, useEffect } from 'react';
import { SENSOR_CONFIG, KNOWN_SENSOR_TYPES } from '../../monitoring/charts/chartConfig';
import { getStoredOverrides, saveOverride, clearOverride, type ThresholdOverride } from '../../../hooks/useBaseline';

interface Props {
  machineId: string;
  machineName: string;
  baseline?: Record<string, { warningMin: number; warningMax: number; criticalMin: number; criticalMax: number; mean: number }>;
  onClose: () => void;
  onSaved: () => void;
}

const ThresholdOverrideModal: React.FC<Props> = ({ machineId, machineName, baseline, onClose, onSaved }) => {
  const existingOverrides = getStoredOverrides()[machineId] ?? {};

  const [values, setValues] = useState<Record<string, Partial<ThresholdOverride>>>(() => {
    const init: Record<string, Partial<ThresholdOverride>> = {};
    for (const t of KNOWN_SENSOR_TYPES) {
      const existing = existingOverrides[t];
      const bl = baseline?.[t];
      init[t] = existing ?? (bl ? {
        warningMin: bl.warningMin,
        warningMax: bl.warningMax,
        criticalMin: bl.criticalMin,
        criticalMax: bl.criticalMax,
      } : {});
    }
    return init;
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = () => {
    for (const t of KNOWN_SENSOR_TYPES) {
      const v = values[t];
      if (v && v.warningMin !== undefined && v.warningMax !== undefined &&
          v.criticalMin !== undefined && v.criticalMax !== undefined) {
        saveOverride(machineId, t, v as ThresholdOverride);
      }
    }
    onSaved();
    onClose();
  };

  const handleClear = (type: string) => {
    clearOverride(machineId, type);
    const bl = baseline?.[type];
    setValues((prev) => ({
      ...prev,
      [type]: bl ? {
        warningMin: bl.warningMin, warningMax: bl.warningMax,
        criticalMin: bl.criticalMin, criticalMax: bl.criticalMax,
      } : {},
    }));
  };

  const set = (type: string, field: keyof ThresholdOverride, raw: string) => {
    const n = parseFloat(raw);
    setValues((prev) => ({ ...prev, [type]: { ...prev[type], [field]: isNaN(n) ? undefined : n } }));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-surface,#fff)', borderRadius: 16, padding: '28px 32px',
        maxWidth: 640, width: '95vw', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={(e) => e.stopPropagation()}>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Manual Threshold Override</h2>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-muted)' }}>
            {machineName} · Overrides the auto-computed 7-day baseline. Use for machines in unusual
            environments (e.g. cold storage, high-heat zones).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {KNOWN_SENSOR_TYPES.map((type) => {
            const cfg = SENSOR_CONFIG[type];
            const v = values[type] ?? {};
            const hasOverride = !!existingOverrides[type];
            return (
              <div key={type} style={{
                border: `1.5px solid ${hasOverride ? cfg.color : 'var(--color-border,#e2e8f0)'}`,
                borderRadius: 12, padding: '14px 16px',
                background: hasOverride ? `${cfg.color}08` : 'var(--color-surface-alt,#f8fafc)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{cfg.icon}</span> {cfg.label} <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>({cfg.unit})</span>
                  </span>
                  {hasOverride && (
                    <button onClick={() => handleClear(type)} style={{
                      fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none',
                      borderRadius: 6, padding: '2px 10px', cursor: 'pointer', fontWeight: 600,
                    }}>
                      Reset to auto
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                  {([
                    ['criticalMin', '🔴 Crit Min'],
                    ['warningMin',  '🟡 Warn Min'],
                    ['warningMax',  '🟡 Warn Max'],
                    ['criticalMax', '🔴 Crit Max'],
                  ] as [keyof ThresholdOverride, string][]).map(([field, label]) => (
                    <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 600 }}>{label}</span>
                      <input
                        type="number"
                        step="0.1"
                        value={v[field] ?? ''}
                        onChange={(e) => set(type, field, e.target.value)}
                        style={{
                          border: '1.5px solid var(--color-input-border,#d1d5db)',
                          borderRadius: 8, padding: '6px 10px', fontSize: 13,
                          background: 'var(--color-input-bg,#fff)', color: 'var(--color-text,#111)',
                          width: '100%',
                        }}
                        placeholder={`e.g. ${cfg.domain[field === 'criticalMax' || field === 'warningMax' ? 1 : 0]}`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 9, border: '1.5px solid var(--color-border,#e2e8f0)',
            background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: 'var(--color-muted,#6b7280)',
          }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{
            padding: '9px 20px', borderRadius: 9, border: 'none',
            background: 'var(--color-primary,#3b82f6)', color: '#fff',
            cursor: 'pointer', fontSize: 13, fontWeight: 700,
          }}>
            Save overrides
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThresholdOverrideModal;
