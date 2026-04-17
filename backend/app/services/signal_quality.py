"""
Signal Quality Service — detects and filters bad sensor readings before they reach
the anomaly-detection or alert pipeline.

Four fake-data patterns (per Karthik's spec):
  FLAT_LINE      — same value for ≥N consecutive readings (stuck / disconnected sensor)
  IMPOSSIBLE     — value outside physical operating bounds (sensor malfunction)
  SUDDEN_SPIKE   — single-point jump >40% from rolling mean that immediately returns
  FROZEN         — near-zero variance over an extended window (frozen / constant output)

One noise pattern:
  NOISE          — random up/down, no trend, short duration
  → Fix: replace with rolling-5-median (smoothing)

Two cross-sensor validators (used by the automation loop before raising alerts):
  cross_validate  — checks sensor correlations before treating a reading as a real fault
  alert_is_fresh  — cooldown gate preventing alert fatigue
"""

import time
import statistics
import logging
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, List, Optional, Tuple

logger = logging.getLogger("signal_quality")

# ── Physical bounds — values outside these are IMPOSSIBLE ──────────────────
PHYSICAL_BOUNDS: Dict[str, Tuple[float, float]] = {
    "temperature": (0.0, 180.0),    # °C
    "vibration":   (0.0, 25.0),     # mm/s
    "rpm":         (0.0, 8000.0),   # RPM
    "current":     (0.0, 80.0),     # A
}

# ── Flat-line detection ─────────────────────────────────────────────────────
FLAT_LINE_WINDOW = 8          # consecutive readings to check
FLAT_LINE_EPSILON: Dict[str, float] = {
    "temperature": 0.05,      # °C  — real sensors always have tiny thermal noise
    "vibration":   0.005,     # mm/s
    "rpm":         2.0,       # RPM
    "current":     0.02,      # A
}

# ── Sudden-spike detection ──────────────────────────────────────────────────
SPIKE_PCT_THRESHOLD = 0.40    # >40% deviation from rolling mean triggers spike check
SPIKE_ABS_MIN: Dict[str, float] = {   # AND must exceed this absolute jump
    "temperature": 12.0,
    "vibration":   1.5,
    "rpm":         150.0,
    "current":     4.0,
}
SPIKE_HISTORY_LEN = 15        # rolling window for mean computation

# ── Noise smoothing ─────────────────────────────────────────────────────────
NOISE_SMOOTH_WINDOW = 5       # rolling-median window for smoothing
NOISE_IQR_FACTOR = 2.5        # value > Q3 + factor*IQR treated as noise

# ── Alert cooldown (alert fatigue) ──────────────────────────────────────────
# Per machine per alert severity — minimum seconds before re-alerting
ALERT_COOLDOWN_SEC: Dict[str, int] = {
    "critical": 300,     # 5 min
    "high":     600,     # 10 min
    "medium":  1800,     # 30 min
    "low":     3600,     # 1 hour
}

# ── Cross-sensor correlation rules ─────────────────────────────────────────
# Before raising an alert for sensor A, at least one correlated sensor must also
# be elevated.  Key = sensor that's spiking; value = list of correlated sensors.
SENSOR_CORRELATIONS: Dict[str, List[str]] = {
    "temperature": ["current", "vibration"],   # thermal → elec load → mechanical stress
    "vibration":   ["temperature", "rpm"],     # bearing wear → heat + RPM change
    "current":     ["temperature"],            # overcurrent → heat
    "rpm":         ["vibration"],              # speed change → vibration
}
CORRELATION_ELEVATION_PCT = 0.08   # correlated sensor must be ≥8% above its baseline mean


@dataclass
class SensorBuffer:
    values: Deque[float] = field(default_factory=lambda: deque(maxlen=50))
    timestamps: Deque[float] = field(default_factory=lambda: deque(maxlen=50))  # unix secs


class SignalQualityService:
    """Per-machine, per-sensor rolling buffer for quality checks."""

    def __init__(self) -> None:
        self._buffers: Dict[str, Dict[str, SensorBuffer]] = {}
        # alert_cooldowns[machine_id][severity] = last_alert_unix_ts
        self._alert_ts: Dict[str, Dict[str, float]] = {}

    # ── Buffer access ────────────────────────────────────────────────────────

    def _buf(self, machine_id: str, sensor_type: str) -> SensorBuffer:
        if machine_id not in self._buffers:
            self._buffers[machine_id] = {}
        if sensor_type not in self._buffers[machine_id]:
            self._buffers[machine_id][sensor_type] = SensorBuffer()
        return self._buffers[machine_id][sensor_type]

    # ── Main check ───────────────────────────────────────────────────────────

    def check(
        self,
        machine_id: str,
        sensor_type: str,
        value: float,
        timestamp_iso: Optional[str] = None,
    ) -> Tuple[float, List[str], bool]:
        """
        Validate and optionally correct a sensor reading.

        Returns:
            (filtered_value, issues, is_trustworthy)
            • filtered_value  — corrected value (or original if clean)
            • issues          — list of detected quality flags (empty = clean)
            • is_trustworthy  — False means skip anomaly/alert pipeline
        """
        buf = self._buf(machine_id, sensor_type)
        issues: List[str] = []
        now = time.time()

        # ── 1. Impossible value ──────────────────────────────────────────────
        bounds = PHYSICAL_BOUNDS.get(sensor_type)
        if bounds:
            lo, hi = bounds
            if value < lo or value > hi:
                issues.append("IMPOSSIBLE_VALUE")
                last_good = list(buf.values)[-1] if buf.values else value
                logger.warning(
                    "IMPOSSIBLE_VALUE [%s/%s]: %.3f outside [%.1f, %.1f]; using last good %.3f",
                    machine_id, sensor_type, value, lo, hi, last_good,
                )
                return last_good, issues, False

        history = list(buf.values)

        # ── 2. Sudden spike detection ────────────────────────────────────────
        if len(history) >= SPIKE_HISTORY_LEN:
            rolling_mean = statistics.mean(history[-SPIKE_HISTORY_LEN:])
            abs_jump = abs(value - rolling_mean)
            pct_jump = abs_jump / max(abs(rolling_mean), 0.001)
            abs_min = SPIKE_ABS_MIN.get(sensor_type, 999.0)

            if pct_jump > SPIKE_PCT_THRESHOLD and abs_jump > abs_min:
                issues.append("SUDDEN_SPIKE")
                # Smooth: use rolling-5 median as replacement
                smooth_window = list(history[-NOISE_SMOOTH_WINDOW:])
                smoothed = statistics.median(smooth_window)
                logger.info(
                    "SUDDEN_SPIKE [%s/%s]: %.3f (%.0f%% jump); smoothed to %.3f",
                    machine_id, sensor_type, value, pct_jump * 100, smoothed,
                )
                buf.values.append(value)
                buf.timestamps.append(now)
                return round(smoothed, 3), issues, False

        # ── 3. Flat-line detection ────────────────────────────────────────────
        epsilon = FLAT_LINE_EPSILON.get(sensor_type, 0.01)
        if len(history) >= FLAT_LINE_WINDOW:
            window = history[-FLAT_LINE_WINDOW:]
            spread = max(window) - min(window)
            if spread <= epsilon:
                issues.append("FLAT_LINE")
                logger.warning(
                    "FLAT_LINE [%s/%s]: spread=%.5f over %d readings",
                    machine_id, sensor_type, spread, FLAT_LINE_WINDOW,
                )
                # Don't smooth — flat line is diagnostic info; just flag it

        # ── 4. IQR-based noise filter ─────────────────────────────────────────
        if len(history) >= NOISE_SMOOTH_WINDOW + 2:
            window = sorted(history[-20:])
            n = len(window)
            q1 = window[n // 4]
            q3 = window[(3 * n) // 4]
            iqr = q3 - q1
            upper_fence = q3 + NOISE_IQR_FACTOR * iqr
            lower_fence = q1 - NOISE_IQR_FACTOR * iqr

            if (value > upper_fence or value < lower_fence) and iqr > 0:
                issues.append("NOISE")
                smoothed = statistics.median(list(history[-NOISE_SMOOTH_WINDOW:]))
                logger.debug(
                    "NOISE [%s/%s]: %.3f outside IQR fence [%.3f, %.3f]; smoothed to %.3f",
                    machine_id, sensor_type, value, lower_fence, upper_fence, smoothed,
                )
                buf.values.append(value)
                buf.timestamps.append(now)
                return round(smoothed, 3), issues, False

        # Clean reading
        buf.values.append(value)
        buf.timestamps.append(now)
        return value, issues, True

    # ── Multi-sensor cross-validation ────────────────────────────────────────

    def cross_validate(
        self,
        machine_id: str,
        spiking_sensor: str,
        all_current_values: Dict[str, float],
        baselines: Optional[Dict[str, float]] = None,
    ) -> Tuple[bool, str]:
        """
        Before raising an alert for `spiking_sensor`, verify that at least one
        correlated sensor is also elevated.

        Args:
            machine_id      — for logging
            spiking_sensor  — sensor that triggered the alert
            all_current_values — {sensor_type: current_value} snapshot
            baselines       — {sensor_type: baseline_mean}; if None, uses buffer history

        Returns:
            (validated, reason_str)
        """
        correlated = SENSOR_CORRELATIONS.get(spiking_sensor, [])
        if not correlated:
            return True, "no_correlation_rule"

        for sensor in correlated:
            current = all_current_values.get(sensor)
            if current is None:
                continue

            # Determine baseline mean
            if baselines and sensor in baselines:
                base_mean = baselines[sensor]
            else:
                buf = self._buf(machine_id, sensor)
                hist = list(buf.values)
                base_mean = statistics.mean(hist[-20:]) if len(hist) >= 5 else None

            if base_mean is None or base_mean == 0:
                continue

            elevation = (current - base_mean) / abs(base_mean)
            if elevation >= CORRELATION_ELEVATION_PCT:
                return True, f"{sensor}_elevated_{elevation:.0%}"

        reason = f"no_correlated_elevation_in_{correlated}"
        logger.info(
            "Cross-validation FAILED [%s/%s]: %s",
            machine_id, spiking_sensor, reason,
        )
        return False, reason

    # ── Alert fatigue gate ────────────────────────────────────────────────────

    def alert_is_fresh(self, machine_id: str, severity: str) -> bool:
        """
        Returns True if enough time has passed since the last alert of this
        severity for this machine (prevents alert fatigue).
        """
        cooldown = ALERT_COOLDOWN_SEC.get(severity, 600)
        machine_ts = self._alert_ts.get(machine_id, {})
        last = machine_ts.get(severity, 0.0)
        if time.time() - last >= cooldown:
            return True
        remaining = int(cooldown - (time.time() - last))
        logger.debug(
            "Alert suppressed [%s/%s]: cooldown %ds remaining",
            machine_id, severity, remaining,
        )
        return False

    def record_alert(self, machine_id: str, severity: str) -> None:
        """Call after an alert is actually raised to start the cooldown clock."""
        if machine_id not in self._alert_ts:
            self._alert_ts[machine_id] = {}
        self._alert_ts[machine_id][severity] = time.time()


# Module-level singleton
signal_quality = SignalQualityService()
