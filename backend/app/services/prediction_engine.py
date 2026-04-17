"""
Prediction Engine — deterministic failure prediction based on:
  - Machine risk_score (primary driver)
  - Machine tags (to infer failure type)
  - Sensor anomaly patterns (passed in as counts/percentages)
  - Machine age and time since last maintenance

Outputs estimated_hours_remaining, confidence, failure_type, urgency,
and a human-readable recommendation.
"""
from datetime import datetime, timedelta
from typing import Optional
import math


# ── Risk-score → base hours-to-failure mapping ─────────────────────────────
# Uses an exponential decay: higher risk = exponentially fewer hours left.
# risk_score is 0-100.
def _risk_to_base_hours(risk_score: float) -> float:
    """Map a 0-100 risk score to estimated hours remaining before failure."""
    if risk_score <= 0:
        return 8760.0  # 1 year
    # Exponential: h = 8760 * e^(-0.055 * risk)
    hours = 8760.0 * math.exp(-0.055 * risk_score)
    return max(1.0, round(hours, 1))


# ── Failure type inference from machine tags ────────────────────────────────
_TAG_FAILURE_MAP = {
    "bearing-wear": ("Bearing Failure", "Replace bearings and inspect spindle assembly"),
    "thermal-runaway": ("Thermal Runaway / Overheating", "Check cooling system and reduce duty cycle"),
    "cavitation": ("Cavitation / Flow Restriction", "Inspect impeller and clear blockage"),
    "vibration": ("Excessive Vibration", "Balance rotating components and check mounts"),
    "cnc": ("Servo Drive Degradation", "Run drive diagnostics and check backlash"),
    "pump": ("Seal or Impeller Failure", "Inspect mechanical seal and impeller clearance"),
    "conveyor": ("Belt Tension / Drive Failure", "Check belt tension, idlers and drive motor"),
    "compressor": ("Valve or Piston Failure", "Inspect valves, rings and oil separator"),
}

_DEFAULT_FAILURE = ("General Component Degradation", "Schedule full preventive maintenance inspection")


def _infer_failure_type(tags: list) -> tuple:
    for tag in (tags or []):
        if tag in _TAG_FAILURE_MAP:
            return _TAG_FAILURE_MAP[tag]
    return _DEFAULT_FAILURE


# ── Urgency tier from hours remaining ──────────────────────────────────────
def _hours_to_urgency(hours: float) -> str:
    if hours <= 6:
        return "imminent"
    if hours <= 24:
        return "critical"
    if hours <= 72:
        return "high"
    if hours <= 168:  # 1 week
        return "medium"
    return "low"


# ── Confidence scoring ──────────────────────────────────────────────────────
def _compute_confidence(
    risk_score: float,
    anomaly_fraction: float,  # 0-1, fraction of recent readings that were anomalies
    days_since_maintenance: Optional[float],
) -> float:
    """Higher risk + more anomalies + longer since last maintenance = higher confidence."""
    base = 0.40 + (risk_score / 100.0) * 0.40   # 40-80% from risk score
    anomaly_boost = anomaly_fraction * 0.15       # up to +15% from anomalies
    maint_boost = 0.0
    if days_since_maintenance is not None:
        # Confidence increases if overdue on maintenance (capped at +5%)
        maint_boost = min(0.05, days_since_maintenance / 365.0 * 0.05)
    return round(min(0.98, base + anomaly_boost + maint_boost), 2)


# ── Main prediction function ────────────────────────────────────────────────
def compute_prediction(
    machine_id: str,
    machine_name: str,
    risk_score: float,
    tags: list,
    install_date_str: Optional[str] = None,
    last_maintenance_date_str: Optional[str] = None,
    anomaly_fraction: float = 0.0,
    extra_adjustment_hours: float = 0.0,  # caller can pass external signal
) -> dict:
    """
    Returns a dict with:
      machine_id, machine_name, estimated_hours_remaining, predicted_failure_at,
      confidence, failure_type, recommendation, urgency
    """
    now = datetime.utcnow()

    # Base hours from risk score
    base_hours = _risk_to_base_hours(risk_score)

    # Reduce by anomaly fraction (each 10% anomaly rate cuts TTF by ~8%)
    anomaly_factor = 1.0 - (anomaly_fraction * 0.8)
    adjusted_hours = base_hours * max(0.1, anomaly_factor)

    # Age penalty: machines older than 5 years get up to 15% reduction
    if install_date_str:
        try:
            install_dt = datetime.strptime(install_date_str, "%Y-%m-%d")
            age_years = (now - install_dt).days / 365.0
            age_penalty = min(0.15, age_years / 5.0 * 0.15)
            adjusted_hours = adjusted_hours * (1.0 - age_penalty)
        except ValueError:
            pass

    # Extra external signal
    adjusted_hours = max(1.0, adjusted_hours + extra_adjustment_hours)

    # Failure type
    failure_type, recommendation = _infer_failure_type(tags)

    # Confidence
    days_since_maint = None
    if last_maintenance_date_str:
        try:
            last_maint = datetime.strptime(last_maintenance_date_str, "%Y-%m-%d")
            days_since_maint = (now - last_maint).days
        except ValueError:
            pass

    confidence = _compute_confidence(risk_score, anomaly_fraction, days_since_maint)

    urgency = _hours_to_urgency(adjusted_hours)
    predicted_failure_at = now + timedelta(hours=adjusted_hours)

    return {
        "machine_id": machine_id,
        "machine_name": machine_name,
        "estimated_hours_remaining": round(adjusted_hours, 1),
        "predicted_failure_at": predicted_failure_at.isoformat(),
        "confidence": confidence,
        "failure_type": failure_type,
        "recommendation": recommendation,
        "urgency": urgency,
    }
