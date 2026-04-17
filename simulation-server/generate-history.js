const fs = require('fs');
const path = require('path');

console.log('⚙️  Generating 7-day sensor history...');

const MACHINES = {
  CNC_01: {
    type: 'CNC Mill',
    pattern: 'bearing_wear',
    baseline: { temp: 75, vib: 2.0, rpm: 1500, current: 12.5 }
  },
  CNC_02: {
    type: 'CNC Lathe',
    pattern: 'thermal_runaway',
    baseline: { temp: 72, vib: 1.8, rpm: 1750, current: 14.0 }
  },
  PUMP_03: {
    type: 'Pump',
    pattern: 'cavitation_clog',
    baseline: { temp: 68, vib: 3.2, rpm: 1450, current: 18.0 }
  },
  CONVEYOR_04: {
    type: 'Conveyor',
    pattern: 'healthy_baseline',
    baseline: { temp: 55, vib: 2.5, rpm: 1200, current: 10.0 }
  }
};

const MINUTES_IN_7_DAYS = 7 * 24 * 60;
const history = {};

function generateReading(machine, minute) {
  const base = MACHINES[machine].baseline;
  const hourOfDay = Math.floor(minute / 60) % 24;

  let tempMultiplier = 1;
  let vibMultiplier = 1;
  let rpmMultiplier = 1;
  let currentMultiplier = 1;

  switch (MACHINES[machine].pattern) {
    case 'bearing_wear': {
      const wearFactor = 1 + (minute / MINUTES_IN_7_DAYS) * 0.5;
      vibMultiplier = wearFactor * (1 + Math.sin(minute / 100) * 0.1);
      tempMultiplier = 1 + (wearFactor - 1) * 0.7;
      break;
    }
    case 'thermal_runaway':
      if (hourOfDay >= 14 && hourOfDay <= 18) {
        tempMultiplier = 1.3 + Math.random() * 0.2;
      }
      break;
    case 'cavitation_clog': {
      const clogFactor = 1 + (minute / MINUTES_IN_7_DAYS) * 0.3;
      rpmMultiplier = 1 - (minute / MINUTES_IN_7_DAYS) * 0.15;
      vibMultiplier = clogFactor;
      break;
    }
    case 'healthy_baseline':
    default:
      break;
  }

  return {
    timestamp: new Date(Date.now() - (MINUTES_IN_7_DAYS - minute) * 60000).toISOString(),
    temperature_C: Math.round((base.temp * tempMultiplier + (Math.random() - 0.5) * 3) * 10) / 10,
    vibration_mm_s: Math.round((base.vib * vibMultiplier + (Math.random() - 0.5) * 0.3) * 100) / 100,
    rpm: Math.round(base.rpm * rpmMultiplier + (Math.random() - 0.5) * 20),
    current_A: Math.round((base.current * currentMultiplier + (Math.random() - 0.5) * 1) * 10) / 10,
    status: 'running'
  };
}

Object.keys(MACHINES).forEach(machine => {
  console.log(`  Generating ${machine}...`);
  history[machine] = [];
  for (let minute = 0; minute < MINUTES_IN_7_DAYS; minute++) {
    history[machine].push(generateReading(machine, minute));
  }
});

const outputPath = path.join(__dirname, 'history.json');
fs.writeFileSync(outputPath, JSON.stringify(history, null, 2));

console.log(`✅ History ready: ${Object.keys(MACHINES).length} machines × ${MINUTES_IN_7_DAYS} readings each.`);
console.log(`📁 Saved to: ${outputPath}`);
