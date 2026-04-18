/**
 * Staged alert sound system — visual first, audio delayed.
 *
 * Stages per severity:
 *   info     — no sound, visual only
 *   warning  — silent for 3s (visual badge), then soft single beep
 *   error    — silent for 2s, then double tone
 *   critical — silent for 2s (show lights), soft tone at 3s, escalating alarm at 5s
 *
 * Uses Web Audio API only — no external files needed.
 */

import { useCallback, useRef } from 'react';

type Severity = 'info' | 'warning' | 'error' | 'critical';

function createBeep(
  ctx: AudioContext,
  freq: number,
  vol: number,
  startAt: number,
  duration: number,
  type: OscillatorType = 'sine',
) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
  gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startAt + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + duration);
  osc.start(ctx.currentTime + startAt);
  osc.stop(ctx.currentTime + startAt + duration + 0.05);
}

export function useAlertSound() {
  // Track last-played time per severity to avoid spam
  const lastPlayed = useRef<Record<string, number>>({});
  const MIN_INTERVAL_MS = 8000;

  const playAlert = useCallback((severity: Severity) => {
    if (severity === 'info') return;

    const now = Date.now();
    if (now - (lastPlayed.current[severity] ?? 0) < MIN_INTERVAL_MS) return;
    lastPlayed.current[severity] = now;

    try {
      const ctx = new AudioContext();

      if (severity === 'warning') {
        // Stage 1 (0s): visual only
        // Stage 2 (3s): single soft beep — "something to notice"
        createBeep(ctx, 440, 0.18, 3.0, 0.35);
      } else if (severity === 'error') {
        // Stage 1 (0s): visual only
        // Stage 2 (2s): two-tone alert
        createBeep(ctx, 523, 0.22, 2.0, 0.25);
        createBeep(ctx, 659, 0.22, 2.4, 0.25);
      } else if (severity === 'critical') {
        // Stage 1 (0-2s): SILENT — show visual lights first
        // Stage 2 (2s): low-volume awareness tone
        createBeep(ctx, 440, 0.15, 2.0, 0.3);
        // Stage 3 (4s): escalating 3-note alarm
        createBeep(ctx, 523, 0.30, 4.0, 0.3);
        createBeep(ctx, 659, 0.35, 4.45, 0.3);
        createBeep(ctx, 784, 0.40, 4.9, 0.45, 'square');
      }
    } catch {
      // AudioContext may be blocked by browser until user interaction — silent fail is OK
    }
  }, []);

  return { playAlert };
}
