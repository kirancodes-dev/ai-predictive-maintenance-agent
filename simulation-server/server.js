const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let historyData = {};
let alerts = [];
let maintenanceSchedules = [];
const connectedClients = new Map();

// Load or generate history data
const historyPath = path.join(__dirname, 'history.json');
if (fs.existsSync(historyPath)) {
  console.log('📂 Loading existing history data...');
  historyData = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
} else {
  console.log('⚙️  Generating history data...');
  execSync('node generate-history.js', { stdio: 'inherit' });
  historyData = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
}

const MACHINES = {
  CNC_01: { type: 'CNC Mill', baseline: { temp: 75, vib: 2.0, rpm: 1500, current: 12.5 } },
  CNC_02: { type: 'CNC Lathe', baseline: { temp: 72, vib: 1.8, rpm: 1750, current: 14.0 } },
  PUMP_03: { type: 'Pump', baseline: { temp: 68, vib: 3.2, rpm: 1450, current: 18.0 } },
  CONVEYOR_04: { type: 'Conveyor', baseline: { temp: 55, vib: 2.5, rpm: 1200, current: 10.0 } }
};

// Current playback state per machine
const currentState = {};
Object.keys(MACHINES).forEach(id => {
  currentState[id] = { index: 0, history: historyData[id] || [] };
});

// SSE stream
app.get('/stream/:machineId', (req, res) => {
  const { machineId } = req.params;
  if (!MACHINES[machineId]) return res.status(404).json({ error: 'Machine not found' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const clientId = Date.now() + Math.random();
  connectedClients.set(clientId, { res, machineId });

  const interval = setInterval(() => {
    const state = currentState[machineId];
    if (state && state.history.length > 0) {
      const reading = { ...state.history[state.index], machine_id: machineId };
      res.write(`data: ${JSON.stringify(reading)}\n\n`);
      state.index = (state.index + 1) % state.history.length;
    }
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
    connectedClients.delete(clientId);
  });
});

// Historical data
app.get('/history/:machineId', (req, res) => {
  const { machineId } = req.params;
  if (!MACHINES[machineId]) return res.status(404).json({ error: 'Machine not found' });

  const { start, end, limit } = req.query;
  let data = historyData[machineId] || [];

  if (start) {
    const startDate = new Date(start);
    data = data.filter(r => new Date(r.timestamp) >= startDate);
  }
  if (end) {
    const endDate = new Date(end);
    data = data.filter(r => new Date(r.timestamp) <= endDate);
  }
  if (limit) {
    data = data.slice(-parseInt(limit));
  }

  res.json({ machine_id: machineId, data, total: data.length });
});

// List machines
app.get('/machines', (req, res) => {
  const machines = Object.keys(MACHINES).map(id => ({
    id,
    type: MACHINES[id].type,
    baseline: MACHINES[id].baseline,
    current_reading: (() => {
      const s = currentState[id];
      return s && s.history.length ? s.history[s.index] : null;
    })()
  }));
  res.json(machines);
});

// Create alert
app.post('/alert', (req, res) => {
  const { machine_id, reason, reading } = req.body;
  if (!machine_id || !reason) return res.status(400).json({ error: 'machine_id and reason are required' });

  const alert = {
    id: `alert_${Date.now()}`,
    machine_id,
    reason,
    reading: reading || null,
    timestamp: new Date().toISOString(),
    acknowledged: false,
    resolved: false
  };
  alerts.push(alert);
  console.log(`🚨 Alert received for ${machine_id}: ${reason}`);
  res.status(201).json(alert);
});

// Get alerts
app.get('/alerts', (req, res) => {
  const { machine_id, acknowledged, resolved } = req.query;
  let filtered = [...alerts];
  if (machine_id) filtered = filtered.filter(a => a.machine_id === machine_id);
  if (acknowledged !== undefined) filtered = filtered.filter(a => a.acknowledged === (acknowledged === 'true'));
  if (resolved !== undefined) filtered = filtered.filter(a => a.resolved === (resolved === 'true'));
  res.json(filtered);
});

// Acknowledge alert
app.patch('/alerts/:alertId/acknowledge', (req, res) => {
  const alert = alerts.find(a => a.id === req.params.alertId);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  alert.acknowledged = true;
  res.json(alert);
});

// Schedule maintenance
app.post('/schedule-maintenance', (req, res) => {
  const { machine_id, proposed_slot, description, priority } = req.body;
  if (!machine_id) return res.status(400).json({ error: 'machine_id is required' });

  let scheduledTime = proposed_slot ? new Date(proposed_slot) : new Date();
  if (!proposed_slot) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
    scheduledTime.setHours(6, 0, 0, 0);
  }

  const schedule = {
    id: `maint_${Date.now()}`,
    machine_id,
    description: description || 'Scheduled maintenance',
    priority: priority || 'medium',
    scheduled_time: scheduledTime.toISOString(),
    status: 'scheduled',
    created_at: new Date().toISOString()
  };
  maintenanceSchedules.push(schedule);
  console.log(`🔧 Maintenance scheduled for ${machine_id} at ${scheduledTime}`);
  res.status(201).json(schedule);
});

// Get maintenance schedules
app.get('/maintenance', (req, res) => {
  const { machine_id, status } = req.query;
  let filtered = [...maintenanceSchedules];
  if (machine_id) filtered = filtered.filter(s => s.machine_id === machine_id);
  if (status) filtered = filtered.filter(s => s.status === status);
  res.json(filtered);
});

// Dashboard HTML
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>🏭 Malendau - Sensor Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; background: linear-gradient(135deg, #667eea, #764ba2); min-height: 100vh; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: white; margin-bottom: 24px; font-size: 2em; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .machine-id { font-size: 1.3em; font-weight: bold; }
        .badge { background: #667eea; color: white; padding: 3px 10px; border-radius: 20px; font-size: 0.8em; }
        .sensors { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .sensor { background: #f5f5f5; padding: 12px; border-radius: 8px; }
        .label { font-size: 0.8em; color: #666; }
        .value { font-size: 1.6em; font-weight: bold; color: #333; }
        .unit { font-size: 0.7em; color: #999; }
        .api { background: white; border-radius: 12px; padding: 20px; margin-top: 20px; }
        .endpoint { background: #f9f9f9; padding: 8px 12px; margin: 6px 0; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
        .get { color: #61affe; font-weight: bold; }
        .post { color: #49cc90; font-weight: bold; }
    </style>
</head>
<body>
<div class="container">
    <h1>🏭 Malendau Hackathon — Live Sensor Dashboard</h1>
    <div class="grid" id="grid"></div>
    <div class="api">
        <b>API Endpoints</b>
        <div class="endpoint"><span class="get">GET</span>  /stream/{machine_id} — SSE real-time stream</div>
        <div class="endpoint"><span class="get">GET</span>  /history/{machine_id}?limit=N — historical data</div>
        <div class="endpoint"><span class="get">GET</span>  /machines — list all machines</div>
        <div class="endpoint"><span class="post">POST</span> /alert — raise alert</div>
        <div class="endpoint"><span class="post">POST</span> /schedule-maintenance — schedule maintenance</div>
    </div>
</div>
<script>
const machines = ['CNC_01','CNC_02','PUMP_03','CONVEYOR_04'];
const types = {CNC_01:'CNC Mill',CNC_02:'CNC Lathe',PUMP_03:'Pump',CONVEYOR_04:'Conveyor'};
machines.forEach(id => {
    const es = new EventSource('/stream/'+id);
    es.onmessage = e => {
        const d = JSON.parse(e.data);
        let card = document.getElementById('c-'+id);
        if (!card) {
            card = document.createElement('div');
            card.id = 'c-'+id; card.className = 'card';
            card.innerHTML = \`<div class="card-header"><span class="machine-id">\${id}</span><span class="badge">\${types[id]}</span></div>
            <div class="sensors">
                <div class="sensor"><div class="label">🌡️ Temperature</div><div class="value"><span id="\${id}-t">--</span><span class="unit"> °C</span></div></div>
                <div class="sensor"><div class="label">📳 Vibration</div><div class="value"><span id="\${id}-v">--</span><span class="unit"> mm/s</span></div></div>
                <div class="sensor"><div class="label">🔄 RPM</div><div class="value"><span id="\${id}-r">--</span></div></div>
                <div class="sensor"><div class="label">⚡ Current</div><div class="value"><span id="\${id}-c">--</span><span class="unit"> A</span></div></div>
            </div>\`;
            document.getElementById('grid').appendChild(card);
        }
        document.getElementById(id+'-t').textContent = d.temperature_C.toFixed(1);
        document.getElementById(id+'-v').textContent = d.vibration_mm_s.toFixed(2);
        document.getElementById(id+'-r').textContent = d.rpm;
        document.getElementById(id+'-c').textContent = d.current_A.toFixed(1);
    };
});
</script>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'index.html'), dashboardHTML);

app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  🏭  Malendau Sensor Simulation Server           ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Dashboard  →  http://localhost:${PORT}              ║`);
  console.log(`║  Machines   →  GET  /machines                    ║`);
  console.log(`║  Stream     →  GET  /stream/{machine_id}         ║`);
  console.log(`║  History    →  GET  /history/{machine_id}        ║`);
  console.log(`║  Alert      →  POST /alert                       ║`);
  console.log(`║  Maintain   →  POST /schedule-maintenance        ║`);
  console.log('╚══════════════════════════════════════════════════╝\n');
});

process.on('SIGINT', () => {
  connectedClients.forEach(c => c.res.end());
  process.exit(0);
});
