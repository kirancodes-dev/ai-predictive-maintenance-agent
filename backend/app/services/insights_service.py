"""
Insights Service — AI intelligence layer on top of raw sensor data.

Features:
  1. Failure Phase Fingerprinting  — which degradation phase each machine is in (0-3)
  2. Sensor Correlation Analysis   — detect broken/anomalous sensor relationships
  3. Maintenance Window Prediction — optimal maintenance time slots
  4. AI Incident Report Generation — natural-language engineering summaries
  5. ROI Calculator                — quantified savings from early detection
  6. Sim-server Alert Reporting    — auto-POST confirmed anomalies back to simulator
"""

import logging
import statistics
import httpx
from datetime import datetime, timedelta
from typing import Optional

from app.config import settings

logger = logging.getLogger("insights")

# ── Machine profiles ─────────────────────────────────────────────────────────

MACHINE_PROFILES = {
    "CNC_01": {
        "name": "CNC Mill 01",
        "failure_mode": "Bearing Degradation",
        "failure_mode_code": "BEARING_WEAR",
        "baseline": {"temperature_C": 72.0, "vibration_mm_s": 1.8, "rpm": 1480.0, "current_A": 12.5},
        "fault_values": {"temperature_C": 92.0, "vibration_mm_s": 5.0, "rpm": 1200.0, "current_A": 18.0},
        "downtime_cost_per_hour": 2500.0,
        "planned_maintenance_cost": 1200.0,
        "emergency_repair_cost": 4800.0,
        "total_degradation_hours": 72.0,
        "phase_key": "vibration_mm_s",
        "phase_thresholds": [1.8, 2.2, 2.8, 3.5],
    },
    "CNC_02": {
        "name": "CNC Lathe 02",
        "failure_mode": "Thermal Runaway",
        "failure_mode_code": "THERMAL_RUNAWAY",
        "baseline": {"temperature_C": 68.0, "vibration_mm_s": 1.5, "rpm": 1490.0, "current_A": 11.8},
        "fault_values": {"temperature_C": 112.0, "vibration_mm_s": 4.0, "rpm": 1400.0, "current_A": 22.0},
        "downtime_cost_per_hour": 2200.0,
        "planned_maintenance_cost": 1000.0,
        "emergency_repair_cost": 4200.0,
        "total_degradation_hours": 48.0,
        "phase_key": "temperature_C",
        "phase_thresholds": [68.0, 82.0, 95.0, 108.0],
    },
    "PUMP_03": {
        "name": "Industrial Pump 03",
        "failure_mode": "Cavitation & Clogging",
        "failure_mode_code": "CAVITATION",
        "baseline": {"temperature_C": 55.0, "vibration_mm_s": 2.2, "rpm": 2950.0, "current_A": 18.0},
        "fault_values": {"temperature_C": 88.0, "vibration_mm_s": 8.0, "rpm": 2700.0, "current_A": 24.0},
        "downtime_cost_per_hour": 1800.0,
        "planned_maintenance_cost": 900.0,
        "emergency_repair_cost": 3600.0,
        "total_degradation_hours": 168.0,
        "phase_key": "rpm",
        "phase_thresholds": [2950.0, 2900.0, 2850.0, 2800.0],  # descending: lower = worse
        "phase_inverted": True,
    },
    "CONVEYOR_04": {
        "name": "Conveyor Belt 04",
        "failure_mode": "Belt Wear",
        "failure_mode_code": "BELT_WEAR",
        "baseline": {"temperature_C": 45.0, "vibration_mm_s": 0.9, "rpm": 720.0, "current_A": 8.5},
        "fault_values": {"temperature_C": 82.0, "vibration_mm_s": 3.5, "rpm": 600.0, "current_A": 14.0},
        "downtime_cost_per_hour": 1200.0,
        "planned_maintenance_cost": 600.0,
        "emergency_repair_cost": 2400.0,
        "total_degradation_hours": 120.0,
        "phase_key": "vibration_mm_s",
        "phase_thresholds": [0.9, 1.4, 2.0, 2.8],
    },
}

PHASE_INFO = {
    0: {"name": "Healthy",        "color": "#22c55e", "urgency": "none",     "description": "All sensors within normal operating range. No action required."},
    1: {"name": "Early Warning",  "color": "#f59e0b", "urgency": "low",      "description": "Minor deviations detected. Monitor closely and plan upcoming maintenance."},
    2: {"name": "Degrading",      "color": "#f97316", "urgency": "high",     "description": "Clear degradation pattern active. Schedule maintenance within 48 hours."},
    3: {"name": "Imminent Fault", "color": "#ef4444", "urgency": "critical", "description": "Failure imminent. Immediate intervention required to prevent unplanned downtime."},
}

FIELD_LABELS = {
    "temperature_C":  ("Temperature",  "°C"),
    "vibration_mm_s": ("Vibration",    "mm/s"),
    "rpm":            ("RPM",          "RPM"),
    "current_A":      ("Current",      "A"),
}

FIELDS = ["temperature_C", "vibration_mm_s", "rpm", "current_A"]


# ── Sim-server helpers ────────────────────────────────────────────────────────

async def fetch_recent_history(machine_id: str, hours: int = 6) -> list[dict]:
    """Fetch the last N hours of sensor data from the simulation server."""
    now = datetime.utcnow()
    start = now - timedelta(hours=hours)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{settings.SIMULATION_SERVER_URL}/history/{machine_id}",
                params={"start": start.isoformat(), "end": now.isoformat()},
            )
            if resp.status_code == 200:
                payload = resp.json()
                # Handle both {data: [...]} and plain [...]
                data = payload.get("data", payload) if isinstance(payload, dict) else payload
                return data if isinstance(data, list) else []
    except Exception as exc:
        logger.warning("Could not fetch history for %s: %s", machine_id, exc)
    return []


async def report_alert_to_sim_server(machine_id: str, reason: str) -> bool:
    """POST a confirmed alert back to the simulation server's /alert endpoint."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{settings.SIMULATION_SERVER_URL}/alert",
                json={
                    "machine_id": machine_id,
                    "reason": reason,
                    "triggered_at": datetime.utcnow().isoformat() + "Z",
                },
            )
            success = resp.status_code in (200, 201)
            if success:
                logger.info("Alert reported to sim server: %s — %s", machine_id, reason)
            return success
    except Exception as exc:
        logger.warning("Sim-server alert report failed for %s: %s", machine_id, exc)
        return False


# ── Failure phase detection ───────────────────────────────────────────────────

def _safe_mean(vals: list[float]) -> Optional[float]:
    return statistics.mean(vals) if vals else None

def _safe_max(vals: list[float]) -> Optional[float]:
    return max(vals) if vals else None


def detect_failure_phase(machine_id: str, history: list[dict]) -> dict:
    """
    Classify the current failure phase (0-3) for a machine based on recent
    sensor history.  Returns phase metadata + RUL estimate.
    """
    profile = MACHINE_PROFILES.get(machine_id)
    if not profile or not history:
        return _unknown_phase(machine_id)

    key = profile["phase_key"]
    thresholds = profile["phase_thresholds"]
    inverted = profile.get("phase_inverted", False)
    baseline = profile["baseline"]

    vals = [float(r[key]) for r in history if key in r]
    if not vals:
        return _unknown_phase(machine_id)

    avg = statistics.mean(vals)
    recent = statistics.mean(vals[-min(10, len(vals)):]) if vals else avg

    # Phase determination
    if not inverted:
        if recent >= thresholds[3]:
            phase = 3
        elif recent >= thresholds[2]:
            phase = 2
        elif recent >= thresholds[1]:
            phase = 1
        else:
            phase = 0
    else:
        # Inverted: lower value = worse (e.g. RPM declining)
        if recent <= thresholds[3]:
            phase = 3
        elif recent <= thresholds[2]:
            phase = 2
        elif recent <= thresholds[1]:
            phase = 1
        else:
            phase = 0

    # RUL estimate
    fault_val = profile["fault_values"][key]
    baseline_val = baseline[key]
    total_hours = profile["total_degradation_hours"]

    if not inverted:
        pct = max(0.0, min(1.0, (recent - baseline_val) / max(fault_val - baseline_val, 0.001)))
    else:
        pct = max(0.0, min(1.0, (baseline_val - recent) / max(baseline_val - fault_val, 0.001)))

    rul_hours = round((1.0 - pct) * total_hours, 1)

    # Sensor summaries
    sensor_deltas = {}
    for f in FIELDS:
        field_vals = [float(r[f]) for r in history if f in r]
        if field_vals:
            label, unit = FIELD_LABELS[f]
            f_avg = statistics.mean(field_vals)
            delta = round(f_avg - baseline[f], 2)
            sensor_deltas[f] = {
                "label": label, "unit": unit,
                "current": round(f_avg, 2),
                "baseline": baseline[f],
                "delta": delta,
                "pct_change": round(delta / baseline[f] * 100, 1) if baseline[f] else 0,
            }

    # Trend over last 10 readings vs first 10
    trend = "stable"
    if len(vals) >= 20:
        early = statistics.mean(vals[:10])
        late  = statistics.mean(vals[-10:])
        diff_pct = abs(late - early) / max(abs(early), 0.001) * 100
        if diff_pct > 5:
            if (not inverted and late > early) or (inverted and late < early):
                trend = "worsening"
            else:
                trend = "improving"

    info = PHASE_INFO[phase]
    return {
        "machine_id":    machine_id,
        "machine_name":  profile["name"],
        "failure_mode":  profile["failure_mode"],
        "failure_code":  profile["failure_mode_code"],
        "phase":         phase,
        "phase_name":    info["name"],
        "phase_color":   info["color"],
        "phase_urgency": info["urgency"],
        "phase_description": info["description"],
        "rul_hours":     rul_hours,
        "pct_to_fault":  round(pct * 100, 1),
        "trend":         trend,
        "key_sensor":    FIELD_LABELS[key][0],
        "key_value":     round(recent, 2),
        "key_baseline":  baseline_val,
        "sensor_deltas": sensor_deltas,
        "sample_count":  len(history),
    }


def _unknown_phase(machine_id: str) -> dict:
    profile = MACHINE_PROFILES.get(machine_id, {})
    return {
        "machine_id": machine_id,
        "machine_name": profile.get("name", machine_id),
        "failure_mode": profile.get("failure_mode", "Unknown"),
        "failure_code": profile.get("failure_mode_code", "UNKNOWN"),
        "phase": 0, "phase_name": "Unknown", "phase_color": "#6b7280",
        "phase_urgency": "none", "phase_description": "Insufficient data",
        "rul_hours": None, "pct_to_fault": 0.0, "trend": "unknown",
        "key_sensor": "-", "key_value": None, "key_baseline": None,
        "sensor_deltas": {}, "sample_count": 0,
    }


# ── Sensor correlation analysis ───────────────────────────────────────────────

def _pearson(xs: list[float], ys: list[float]) -> float:
    n = min(len(xs), len(ys))
    if n < 3:
        return 0.0
    xs, ys = xs[-n:], ys[-n:]
    mx, my = statistics.mean(xs), statistics.mean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    dx  = (sum((x - mx) ** 2 for x in xs)) ** 0.5
    dy  = (sum((y - my) ** 2 for y in ys)) ** 0.5
    return round(num / (dx * dy), 3) if dx * dy > 0 else 0.0


# Expected correlation signs between sensor pairs (positive/negative/weak)
EXPECTED_CORRELATION = {
    ("temperature_C",  "current_A"):     ("positive", 0.5),
    ("temperature_C",  "vibration_mm_s"):("positive", 0.3),
    ("temperature_C",  "rpm"):           ("negative", -0.3),
    ("vibration_mm_s", "current_A"):     ("positive", 0.4),
    ("vibration_mm_s", "rpm"):           ("negative", -0.2),
    ("rpm",            "current_A"):     ("negative", -0.4),
}


def compute_correlations(history: list[dict]) -> dict:
    """Compute Pearson correlations between all sensor pairs and flag anomalies."""
    series = {f: [float(r[f]) for r in history if f in r] for f in FIELDS}
    matrix = {}
    anomalies = []

    for i, f1 in enumerate(FIELDS):
        matrix[f1] = {}
        for j, f2 in enumerate(FIELDS):
            if i == j:
                matrix[f1][f2] = 1.0
                continue
            if j < i:
                matrix[f1][f2] = matrix[f2][f1]
                continue
            corr = _pearson(series[f1], series[f2])
            matrix[f1][f2] = corr

            key = (f1, f2) if (f1, f2) in EXPECTED_CORRELATION else (f2, f1)
            if key in EXPECTED_CORRELATION:
                direction, expected_min = EXPECTED_CORRELATION[key]
                l1, _ = FIELD_LABELS[f1]
                l2, _ = FIELD_LABELS[f2]
                if direction == "positive" and corr < 0:
                    anomalies.append(f"{l1}↑ while {l2}↓ — unexpected inverse (expected positive correlation)")
                elif direction == "negative" and corr > 0.2:
                    anomalies.append(f"{l1} and {l2} moving together — unexpected (expected negative correlation)")

    labeled = {FIELD_LABELS[f][0]: {FIELD_LABELS[f2][0]: v for f2, v in row.items()} for f, row in matrix.items()}
    return {
        "matrix": labeled,
        "raw_matrix": matrix,
        "anomalies": list(set(anomalies)),
        "sample_count": len(history),
    }


# ── Time-of-day risk windows ───────────────────────────────────────────────────

# Hardcoded time-of-day risk profiles per machine, derived from historical patterns.
# Hours are UTC. Each machine lists its HIGH-RISK UTC hours for its primary failure mode.
_TIME_OF_DAY_RISK: dict = {
    "CNC_02": {
        "risk_hours": [12, 13, 14, 15],          # UTC 12-15 = 2-4 PM IST/BST
        "peak_label": "2–4 PM (afternoon shift)",
        "reason":     "Thermal runaway correlates with afternoon production peaks — coolant temp rises 22°C above baseline during this window.",
        "safe_hours": [22, 23, 0, 1, 2, 3],      # UTC 22-03 = early morning
        "safe_label": "10 PM – 3 AM",
        "safe_reason": "Overnight low-load period — thermal sensors return to baseline. Best window for coolant inspection.",
    },
    "PUMP_03": {
        "risk_hours": [6, 7, 8, 9],              # morning production ramp-up
        "peak_label": "6–10 AM (morning startup)",
        "reason":     "Cavitation events spike during pump startup under high discharge pressure. RPM oscillations detected.",
        "safe_hours": [14, 15, 16, 17],
        "safe_label": "2–6 PM (steady-state)",
        "safe_reason": "Stable mid-afternoon flow rate — lowest cavitation risk window.",
    },
    "CNC_01": {
        "risk_hours": [9, 10, 11, 13, 14],       # mid-morning + post-lunch
        "peak_label": "9–11 AM & 1–3 PM",
        "reason":     "Bearing wear accelerates under peak machining load. Vibration amplitude peaks during dense job scheduling.",
        "safe_hours": [18, 19, 20, 21],
        "safe_label": "6–10 PM (end of shift)",
        "safe_reason": "Reduced machining load after shift handover — safest window for bearing inspection.",
    },
    "CONVEYOR_04": {
        "risk_hours": [7, 8, 15, 16],            # shift change surge loads
        "peak_label": "7–9 AM & 3–5 PM (shift changes)",
        "reason":     "Belt tension irregularities spike during shift-change surge loading when throughput doubles briefly.",
        "safe_hours": [12, 13],
        "safe_label": "12–2 PM (lunch break)",
        "safe_reason": "Minimum throughput period — belt operates at 30% load. Ideal for tensioner adjustment.",
    },
}


def get_time_of_day_risk(machine_id: str) -> dict:
    """
    Return the time-of-day risk profile for a machine: when it is at highest
    failure risk during the day and when the safest maintenance window is.

    Includes a 'now_in_risk_window' flag so the frontend can highlight
    live danger.
    """
    profile = _TIME_OF_DAY_RISK.get(machine_id)
    if not profile:
        return {
            "machine_id": machine_id,
            "available": False,
            "now_in_risk_window": False,
        }

    now_hour = datetime.utcnow().hour
    in_risk = now_hour in profile["risk_hours"]
    in_safe = now_hour in profile["safe_hours"]

    # How many hours until next risk window starts?
    risk_hours_sorted = sorted(profile["risk_hours"])
    hours_to_risk = None
    for h in risk_hours_sorted:
        delta = (h - now_hour) % 24
        if delta > 0:
            hours_to_risk = delta
            break
    if hours_to_risk is None:
        hours_to_risk = (risk_hours_sorted[0] - now_hour) % 24

    return {
        "machine_id":         machine_id,
        "available":          True,
        "now_in_risk_window": in_risk,
        "now_in_safe_window": in_safe,
        "peak_risk_window":   profile["peak_label"],
        "peak_risk_reason":   profile["reason"],
        "safe_window":        profile["safe_label"],
        "safe_window_reason": profile["safe_reason"],
        "hours_to_next_risk": hours_to_risk if not in_risk else 0,
        "current_utc_hour":   now_hour,
        "risk_hours_utc":     profile["risk_hours"],
        "alert": (
            f"⚠ ACTIVE RISK WINDOW: {profile['peak_label']} — {profile['reason']}"
            if in_risk else
            f"Next high-risk window in {hours_to_risk}h: {profile['peak_label']}"
        ),
    }


# ── Maintenance window prediction ─────────────────────────────────────────────

def predict_maintenance_windows(machine_id: str, phase_result: dict) -> dict:
    """
    Suggest 3 maintenance windows based on failure trajectory.
    Prioritises business-hours slots that fall before projected fault time.
    """
    now = datetime.utcnow()
    rul = phase_result.get("rul_hours")
    phase = phase_result.get("phase", 0)

    if rul is None or phase == 0:
        fault_at = now + timedelta(days=30)
    else:
        fault_at = now + timedelta(hours=rul)

    # Target: do maintenance 4-8h before fault
    buffer = timedelta(hours=min(8, max(2, rul * 0.1))) if rul else timedelta(hours=24)
    target = fault_at - buffer

    def next_business_slot(after: datetime) -> datetime:
        """Find next 7–9 AM weekday slot after `after`."""
        dt = after.replace(minute=0, second=0, microsecond=0)
        for _ in range(14):
            dt += timedelta(hours=1)
            if dt.weekday() < 5 and 7 <= dt.hour <= 9:
                return dt
        return dt

    windows = []

    # Window 1: optimal (right before fault)
    w1 = target if target > now + timedelta(hours=2) else now + timedelta(hours=2)
    windows.append({
        "label":       "Optimal",
        "slot":        w1.isoformat() + "Z",
        "slot_display": _fmt_slot(w1, now),
        "urgency":     "critical" if phase >= 3 else "high" if phase >= 2 else "medium",
        "reason":      f"Directly before projected fault — {_hrs(fault_at, w1)} of buffer remaining",
    })

    # Window 2: next business morning
    w2 = next_business_slot(now)
    windows.append({
        "label":       "Next Business Slot",
        "slot":        w2.isoformat() + "Z",
        "slot_display": _fmt_slot(w2, now),
        "urgency":     "high" if phase >= 2 else "medium",
        "reason":      "Early-morning pre-shift slot minimises production impact",
    })

    # Window 3: business morning after that
    w3 = next_business_slot(w2 + timedelta(hours=1))
    in_time = w3 < fault_at
    windows.append({
        "label":       "Secondary Slot",
        "slot":        w3.isoformat() + "Z",
        "slot_display": _fmt_slot(w3, now),
        "urgency":     "low",
        "reason":      "Buffer option — proceed only if Window 1/2 are not feasible"
                        + ("" if in_time else " ⚠ May be too late given current trajectory"),
        "warning":     not in_time,
    })

    return {
        "machine_id":        machine_id,
        "projected_fault_at": fault_at.isoformat() + "Z",
        "rul_hours":          rul,
        "windows":            windows,
    }


def _fmt_slot(dt: datetime, now: datetime) -> str:
    diff = dt - now
    hours = int(diff.total_seconds() / 3600)
    days  = hours // 24
    label = f"in {days}d {hours % 24}h" if days else f"in {hours}h"
    return f"{dt.strftime('%a %d %b %H:%M')} UTC ({label})"


def _hrs(a: datetime, b: datetime) -> str:
    h = int((a - b).total_seconds() / 3600)
    return f"{h}h"


# ── ROI Calculator ────────────────────────────────────────────────────────────

def calculate_roi(machine_id: str, phase_result: dict) -> dict:
    """Estimate financial savings from early detection vs run-to-failure."""
    profile = MACHINE_PROFILES.get(machine_id)
    if not profile:
        return {}

    rul = phase_result.get("rul_hours") or 0.0
    phase = phase_result.get("phase", 0)

    downtime_rate     = profile["downtime_cost_per_hour"]
    planned_cost      = profile["planned_maintenance_cost"]
    emergency_cost    = profile["emergency_repair_cost"]

    # Unplanned downtime if we do nothing: 4–12h depending on severity
    unplanned_hours   = max(2.0, min(12.0, 4.0 + (3 - phase) * 0.5 + (72 - min(rul, 72)) * 0.05))
    downtime_saved    = round(unplanned_hours * downtime_rate, 0)
    repair_saved      = round(emergency_cost - planned_cost, 0)
    total_saved       = round(downtime_saved + repair_saved, 0)

    # Production units (assume 50 units/h for CNC, 80 for conveyor, 120 for pump)
    units_per_hour = {"CNC_01": 50, "CNC_02": 50, "PUMP_03": 120, "CONVEYOR_04": 80}.get(machine_id, 60)
    units_saved = int(unplanned_hours * units_per_hour)

    return {
        "machine_id":              machine_id,
        "phase":                   phase,
        "rul_hours":               rul,
        "unplanned_downtime_hours": round(unplanned_hours, 1),
        "downtime_cost_per_hour":  downtime_rate,
        "downtime_cost_saved":     downtime_saved,
        "emergency_repair_cost":   emergency_cost,
        "planned_maintenance_cost": planned_cost,
        "repair_cost_saved":       repair_saved,
        "total_savings":           total_saved,
        "production_units_saved":  units_saved,
        "detection_value":         f"${total_saved:,.0f}",
    }


# ── Incident report ───────────────────────────────────────────────────────────

def generate_incident_report(
    machine_id: str,
    phase_result: dict,
    correlation_result: dict,
    roi_result: dict,
    windows_result: dict,
) -> dict:
    """Generate a natural-language engineering incident report."""
    profile  = MACHINE_PROFILES.get(machine_id, {})
    phase    = phase_result.get("phase", 0)
    info     = PHASE_INFO[phase]
    name     = profile.get("name", machine_id)
    mode     = profile.get("failure_mode", "Unknown")
    rul      = phase_result.get("rul_hours")
    trend    = phase_result.get("trend", "stable")
    key_sens = phase_result.get("key_sensor", "-")
    key_val  = phase_result.get("key_value")
    key_base = phase_result.get("key_baseline")
    pct      = phase_result.get("pct_to_fault", 0)
    savings  = roi_result.get("detection_value", "$0")
    windows  = windows_result.get("windows", [])
    w1_slot  = windows[0]["slot_display"] if windows else "TBD"

    # Executive summary
    rul_str = f"approximately {rul:.0f} hours" if rul else "undetermined"
    trend_str = {"worsening": "worsening", "improving": "recovering", "stable": "stable"}.get(trend, "stable")
    delta_str = ""
    if key_val is not None and key_base is not None:
        delta = round(key_val - key_base, 2)
        sign = "+" if delta >= 0 else ""
        delta_str = f" (currently {key_val}, baseline {key_base}, {sign}{delta})"

    summary = (
        f"{name} is in Phase {phase} — **{info['name']}** of {mode}. "
        f"The primary indicator, {key_sens}{delta_str}, is {trend_str}. "
        f"Estimated remaining useful life: {rul_str}. "
        f"{info['description']}"
    )

    # Sensor analysis lines
    sensor_lines = []
    for f, sd in phase_result.get("sensor_deltas", {}).items():
        sign = "+" if sd["delta"] >= 0 else ""
        status = "⚠ ELEVATED" if abs(sd["pct_change"]) > 10 else ("↑ rising" if sd["delta"] > 0 else ("↓ falling" if sd["delta"] < 0 else "● normal"))
        sensor_lines.append(f"{sd['label']}: {sd['current']} {sd['unit']} (baseline {sd['baseline']}, {sign}{sd['delta']}) {status}")

    # Correlation anomalies
    corr_notes = correlation_result.get("anomalies", [])
    corr_text = (
        "No anomalous sensor relationships detected." if not corr_notes
        else "The following cross-sensor anomalies were detected:\n" + "\n".join(f"  • {a}" for a in corr_notes)
    )

    # Recommendations based on phase
    recs = {
        0: ["Continue normal monitoring cycle.", "No maintenance action required at this time."],
        1: [f"Schedule inspection of {mode.lower()} system within the next 5 days.",
            "Increase monitoring frequency to 15-minute intervals.",
            f"Prepare replacement parts for {mode.lower()} — lead time check advised."],
        2: [f"Schedule maintenance for {w1_slot}.",
            f"Pre-order replacement parts immediately — {mode.lower()} components required.",
            "Reduce machine load by 20% if operationally feasible to slow degradation.",
            "Assign dedicated technician for daily inspection."],
        3: [f"⛔ STOP non-critical production on {name} immediately.",
            f"Emergency maintenance required NOW — window: {w1_slot}.",
            "Initiate emergency parts procurement.",
            "Do not run at full load — risk of catastrophic failure and safety incident."],
    }

    cost_line = (
        f"By acting now (Phase {phase}), the predicted savings versus run-to-failure are {savings}. "
        f"This includes {roi_result.get('unplanned_downtime_hours', 0):.1f}h of avoided unplanned downtime "
        f"and avoided emergency repair costs of ${roi_result.get('emergency_repair_cost', 0):,.0f}."
        if roi_result else "Cost analysis unavailable."
    )

    return {
        "machine_id":      machine_id,
        "machine_name":    name,
        "failure_mode":    mode,
        "phase":           phase,
        "phase_name":      info["name"],
        "phase_color":     info["color"],
        "generated_at":    datetime.utcnow().isoformat() + "Z",
        "executive_summary": summary,
        "sensor_analysis": sensor_lines,
        "correlation_notes": corr_text,
        "recommendations": recs.get(phase, []),
        "cost_impact":     cost_line,
        "pct_to_fault":    pct,
        "rul_hours":       rul,
    }


# ── Full analysis (all features combined) ────────────────────────────────────

async def full_analysis(machine_id: str) -> dict:
    """Run all insight modules for a single machine. Fetches live history internally."""
    history = await fetch_recent_history(machine_id, hours=6)

    phase    = detect_failure_phase(machine_id, history)
    corr     = compute_correlations(history)
    roi      = calculate_roi(machine_id, phase)
    windows  = predict_maintenance_windows(machine_id, phase)
    tod_risk = get_time_of_day_risk(machine_id)
    report   = generate_incident_report(machine_id, phase, corr, roi, windows)

    # Auto-report to sim server if phase >= 2
    if phase["phase"] >= 2:
        reason = (
            f"Phase {phase['phase']} ({phase['phase_name']}): "
            f"{phase['key_sensor']} at {phase['key_value']} "
            f"({phase['pct_to_fault']}% toward fault). "
            f"Estimated RUL: {phase['rul_hours']}h."
        )
        await report_alert_to_sim_server(machine_id, reason)

    return {
        "machine_id":    machine_id,
        "phase":         phase,
        "correlation":   corr,
        "roi":           roi,
        "windows":       windows,
        "time_of_day":   tod_risk,
        "report":        report,
    }


async def overview_all_machines() -> list[dict]:
    """Lightweight phase + ROI summary for all 4 machines (no correlation/report)."""
    results = []
    for machine_id in MACHINE_PROFILES:
        history = await fetch_recent_history(machine_id, hours=3)
        phase   = detect_failure_phase(machine_id, history)
        roi     = calculate_roi(machine_id, phase)
        tod_risk = get_time_of_day_risk(machine_id)
        results.append({"machine_id": machine_id, "phase": phase, "roi": roi, "time_of_day": tod_risk})
    return results
