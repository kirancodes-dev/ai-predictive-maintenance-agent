import React, { useState } from 'react';
import { useCreateAlert } from '../../../hooks/useAlerts';
import type { AlertSeverity, CreateAlertPayload } from '../../../types/alert.types';

const MACHINES = [
  { id: 'CNC_01', label: 'CNC Machine #1' },
  { id: 'CNC_02', label: 'CNC Machine #2' },
  { id: 'PUMP_03', label: 'Pump #3' },
  { id: 'CONVEYOR_04', label: 'Conveyor #4' },
];

const SEVERITIES: { value: AlertSeverity; label: string; color: string }[] = [
  { value: 'info', label: 'Info', color: '#1a56db' },
  { value: 'warning', label: 'Warning', color: '#f59e0b' },
  { value: 'error', label: 'Error', color: '#f97316' },
  { value: 'critical', label: 'Critical', color: '#dc2626' },
];

interface Props {
  onClose: () => void;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  borderRadius: 8,
  border: '1px solid var(--color-border, #d1d5db)',
  background: 'var(--color-input-bg, #fff)',
  color: 'var(--color-text, #1e293b)',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-muted, #64748b)',
  marginBottom: 4,
};

const ReportAlertModal: React.FC<Props> = ({ onClose }) => {
  const { mutate: createAlert, isLoading } = useCreateAlert();
  const [machineId, setMachineId] = useState(MACHINES[0].id);
  const [severity, setSeverity] = useState<AlertSeverity>('warning');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const canSubmit = title.trim().length >= 3 && message.trim().length >= 3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const payload: CreateAlertPayload = {
      machineId,
      severity,
      title: title.trim(),
      message: message.trim(),
    };
    createAlert(payload, { onSuccess: () => onClose() });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--color-surface, #fff)',
          borderRadius: 16,
          padding: '28px 28px 20px',
          width: 440,
          maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          border: '1px solid var(--color-border, #e2e8f0)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Report Alert</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
              color: 'var(--color-muted, #64748b)', padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--color-muted, #64748b)' }}>
          Manually report an issue. The alert will be sent to the API, broadcast to all connected
          clients via WebSocket, and appear in the alert panel in real-time.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Machine */}
          <div>
            <label style={labelStyle}>Machine</label>
            <select value={machineId} onChange={(e) => setMachineId(e.target.value)} style={fieldStyle}>
              {MACHINES.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label style={labelStyle}>Severity</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSeverity(s.value)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: 12,
                    fontWeight: severity === s.value ? 700 : 500,
                    borderRadius: 8,
                    border: `1.5px solid ${severity === s.value ? s.color : 'var(--color-border, #d1d5db)'}`,
                    background: severity === s.value ? `${s.color}15` : 'transparent',
                    color: severity === s.value ? s.color : 'var(--color-muted, #64748b)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unusual vibration detected"
              style={fieldStyle}
              maxLength={500}
            />
          </div>

          {/* Message */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={3}
              style={{ ...fieldStyle, resize: 'vertical' }}
              maxLength={2000}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: '1px solid var(--color-border, #d1d5db)',
                background: 'transparent',
                color: 'var(--color-muted, #64748b)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isLoading}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: 13,
                fontWeight: 700,
                borderRadius: 8,
                border: 'none',
                background: canSubmit ? '#dc2626' : '#e2e8f0',
                color: canSubmit ? '#fff' : '#94a3b8',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              {isLoading ? 'Sending...' : 'Send Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportAlertModal;
