'use strict';
const express = require('express');
const app = express();
app.use(express.json());

// ── Machine definitions ──────────────────────────────────────────────────────
const MACHINES = {
  CNC_01: {
    id: 'CNC_01', name: 'CNC Machine #1', type: 'CNC Mill', location: 'Zone A',
    pattern: 'bearing_wear',
    // Base values at start of 7-day window
    base: { temperature_C: 72, vibration_mm_s: 1.8, rpm: 1500, current_A: 12.5 },
    // Degradation per 7-day cycle (added linearly)
    degrade: { temperature_C: 32, vibration_mm_s: 1.6, rpm: -20, current_A: 0.8 },
  },
  CNC_02: {
    id: 'CNC_02', name: 'CNC Machine #2', type: 'CNC Lathe', location: 'Zone A',
    pattern: 'thermal_runaway',
    base: { temperature_C: 68, vibration_mm_s: 1.5, rpm: 1750, current_A: 14.0 },
    degrade: { temperature_C: 6, vibration_mm_s: 0.4, rpm: -5, current_A: 0.3 },
  },
  PUMP_03: {
    id: 'PUMP_03', name: 'Pump Station #3', type: 'Industrial Pump', location: 'Zone B',
    pattern: 'cavitation',
    base: { temperature_C: 65, vibration_mm_s: 2.8, rpm: 1500, current_A: 17.5 },
    degrade: { temperature_C: 10, vibration_mm_s: 0.8, rpm: -120, current_A: 1.2 },
  },
  CONVEYOR_04: {
    id: 'CONVEYOR_04', name: 'Conveyor Belt #4', type: 'Conveyor Belt', location: 'Zone C',
    pattern: 'healthy',
    base: { temperature_C: 54, vibration_mm_s: 2.2, rpm: 1200, current_A: 10.0 },
    degrade: { temperature_C: 1, vibration_mm_s: 0.1, rpm: 0, current_A: 0.05 },
  },
};

// Noise scales per sensor type
const NOISE = {
  temperature_C: 1.2, vibration_mm_s: 0.12, rpm: 8, current_A: 0.25,
};

// ── Cycle anchor — both live and history use the same 7-day reference ────────
// Anchored to the UNIX epoch so live and history always stay in sync.
const CYCLE_MS = 7 * 24 * 60 * 60 * 1000;

function cycleStartMs() {
  return Date.now() - (Date.now() % CYCLE_MS);
}

function currentMinuteOffset() {
  return Math.floor((Date.now() % CYCLE_MS) / 60000);
}

// ── Deterministic pseudo-random (seeded) ────────────────────────────────────
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// Smooth noise: average over 4 neighbouring minute-seeds so values drift
// gradually rather than jumping independently every reading.
function smoothNoise(minuteOffset, charCode) {
  const s = (i) => seededRand((minuteOffset + i) * 37 + 1 + charCode);
  return (s(-2) + s(-1) + s(0) + s(1)) / 4 - 0.5;   // range ≈ (-0.5, 0.5)
}

// ── Reading generator ────────────────────────────────────────────────────────
// minuteOffset = minutes since start of 7-day cycle (0..10079)
// Seed is derived solely from minuteOffset so live and history produce the
// same values at the same point in time.
function generateReading(machineId, minuteOffset) {
  const m = MACHINES[machineId];
  if (!m) return null;

  const progress = minuteOffset / 10080;          // 0 → 1 over 7 days
  const hourOfDay = (minuteOffset % 1440) / 60;  // 0–24 h cyclic
  const dayCycle = Math.sin((2 * Math.PI * hourOfDay) / 24);

  const reading = {};

  for (const field of ['temperature_C', 'vibration_mm_s', 'rpm', 'current_A']) {
    const base  = m.base[field];
    const drift = m.degrade[field] * progress;
    // Smoothed noise: small autocorrelated fluctuations, not random jumps
    const noise = smoothNoise(minuteOffset, field.charCodeAt(0)) * 2 * NOISE[field];

    let cycleBias = 0;
    if (field === 'temperature_C') cycleBias = 3 * Math.max(0, dayCycle);
    if (field === 'current_A')     cycleBias = 0.5 * Math.max(0, dayCycle);

    let anomalyBias = 0;

    if (m.pattern === 'thermal_runaway' && field === 'temperature_C') {
      // Gradual 30-min ramp-up from 13:00, gradual 30-min ramp-down after 17:00
      // No hard step — the spike eases in and out smoothly.
      const rampIn  = Math.max(0, Math.min(1, (hourOfDay - 13.0) / 0.5));
      const rampOut = Math.max(0, Math.min(1, (17.0 - hourOfDay) / 0.5));
      const envelope = Math.min(rampIn, rampOut);
      const intensity = seededRand(Math.floor(minuteOffset / 10) * 7 + 3) > 0.7 ? 1.4 : 1.0;
      anomalyBias = envelope * 8 * progress * intensity;
    }

    if (m.pattern === 'cavitation' && field === 'vibration_mm_s') {
      // 10-minute cavitation windows: smooth sine envelope instead of step spikes
      const windowIdx = Math.floor(minuteOffset / 10);
      const inCav = seededRand(windowIdx * 13 + 1) > 0.85;
      if (inCav) {
        const phase = (minuteOffset % 10) / 10;          // 0→1 within window
        anomalyBias = Math.sin(Math.PI * phase) * 0.8 * progress; // sine bell
      }
    }

    reading[field] = Math.round((base + drift + noise + cycleBias + anomalyBias) * 100) / 100;
  }

  reading.temperature_C  = Math.max(30,   reading.temperature_C);
  reading.vibration_mm_s = Math.max(0.05, reading.vibration_mm_s);
  reading.rpm            = Math.max(100,  reading.rpm);
  reading.current_A      = Math.max(1,    reading.current_A);

  return reading;
}

function getLiveReading(machineId) {
  // Use minute-based offset — same formula as history so there's no discontinuity
  // when live data is plotted alongside historical data.
  const offset = currentMinuteOffset();
  const reading = generateReading(machineId, offset);
  if (!reading) return null;
  return { ...reading, timestamp: new Date().toISOString(), status: 'running' };
}

// ── History generation ───────────────────────────────────────────────────────
function getHistory(machineId, opts = {}) {
  const { limit, start, end } = opts;
  // Anchor to the same epoch-aligned cycle used by getLiveReading so that the
  // last history point always matches the current live value.
  const CYCLE_START = cycleStartMs();

  let startMinute = 0;
  let endMinute   = currentMinuteOffset();  // end exactly where live is now

  if (start) {
    const startMs = new Date(start).getTime();
    startMinute = Math.max(0, Math.floor((startMs - CYCLE_START) / 60000));
  }
  if (end) {
    const endMs = new Date(end).getTime();
    endMinute = Math.min(10080, Math.ceil((endMs - CYCLE_START) / 60000));
  }

  const rangeMinutes = Math.max(1, endMinute - startMinute);
  let step = 1;
  if (limit) {
    step = Math.max(1, Math.floor(rangeMinutes / limit));
  } else if (rangeMinutes > 500) {
    step = Math.max(1, Math.floor(rangeMinutes / 500));
  }

  const data = [];
  for (let i = startMinute; i <= endMinute; i += step) {
    const ts = new Date(CYCLE_START + i * 60000).toISOString();
    const reading = generateReading(machineId, i);
    if (reading) {
      data.push({ timestamp: ts, ...reading, status: 'running' });
    }
  }

  return data;
}

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────

app.get('/machines', (req, res) => {
  const list = Object.values(MACHINES).map((m) => {
    const live = getLiveReading(m.id);
    return {
      id: m.id, name: m.name, type: m.type, location: m.location,
      pattern: m.pattern,
      baseline: {
        temp: m.base.temperature_C, vib: m.base.vibration_mm_s,
        rpm: m.base.rpm, current: m.base.current_A,
      },
      current_reading: live,
    };
  });
  res.json(list);
});

app.get('/history/:machineId', (req, res) => {
  const { machineId } = req.params;
  if (!MACHINES[machineId]) {
    return res.status(404).json({ error: `Machine ${machineId} not found` });
  }
  const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
  const start = req.query.start || req.query.from || undefined;
  const end   = req.query.end   || req.query.to   || undefined;

  const data = getHistory(machineId, { limit, start, end });
  res.json({ machine_id: machineId, data, total: data.length });
});

// SSE live stream
app.get('/stream/:machineId', (req, res) => {
  const { machineId } = req.params;
  if (!MACHINES[machineId]) {
    return res.status(404).json({ error: `Machine ${machineId} not found` });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = () => {
    const reading = getLiveReading(machineId);
    if (reading) {
      res.write(`data: ${JSON.stringify(reading)}\n\n`);
    }
  };

  send();  // send immediately
  const timer = setInterval(send, 1000);

  req.on('close', () => clearInterval(timer));
});

// In-memory stores for agent activity (visible on frontend Agent Dashboard)
const alertStore = [];
const maintenanceStore = [];

// Alert receiver
app.post('/alert', (req, res) => {
  const entry = { ...req.body, timestamp: new Date().toISOString(), id: alertStore.length + 1 };
  alertStore.push(entry);
  console.log('[ALERT]', req.body);
  res.json({ success: true });
});

// Retrieve all alerts (used by frontend Agent Dashboard)
app.get('/alerts', (_req, res) => {
  res.json(alertStore);
});

// Maintenance schedule receiver
app.post('/schedule-maintenance', (req, res) => {
  const entry = { ...req.body, timestamp: new Date().toISOString(), id: maintenanceStore.length + 1 };
  maintenanceStore.push(entry);
  console.log('[MAINTENANCE]', req.body);
  res.json({ success: true });
});

// Retrieve all scheduled maintenance (used by frontend Agent Dashboard)
app.get('/maintenance-schedule', (_req, res) => {
  res.json(maintenanceStore);
});

// Root
app.get('/', (req, res) => res.json({
  service: 'Predictive Maintenance Simulation Server',
  status: 'running',
  machines: Object.keys(MACHINES),
  endpoints: ['/machines', '/history/:machineId', '/stream/:machineId', '/health'],
}));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', machines: Object.keys(MACHINES) }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Simulation server running on http://localhost:${PORT}`);
  console.log(`Machines: ${Object.keys(MACHINES).join(', ')}`);
});
