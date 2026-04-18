"""
Dynamic anomaly detection using rolling Z-scores + Isolation Forest ensemble.
No hard-coded thresholds — baselines are learned from historical data.
"""

import logging
from collections import deque
from typing import Dict, List, Optional, Tuple

import numpy as np
from sklearn.ensemble import IsolationForest

from config import (
    ZSCORE_WINDOW,
    ZSCORE_THRESHOLD,
    IF_CONTAMINATION,
    ENSEMBLE_ZSCORE_WEIGHT,
    ENSEMBLE_IF_WEIGHT,
    ANOMALY_SCORE_THRESHOLD,
)

logger = logging.getLogger("ipma.anomaly")

SENSOR_FIELDS = ["temperature_C", "vibration_mm_s", "rpm", "current_A"]


class MachineBaseline:
    """Per-machine rolling statistics + trained Isolation Forest."""

    def __init__(self, machine_id: str):
        self.machine_id = machine_id
        # Rolling windows per sensor
        self.windows: Dict[str, deque] = {f: deque(maxlen=ZSCORE_WINDOW) for f in SENSOR_FIELDS}
        # Isolation Forest model (trained on history)
        self.iso_forest: Optional[IsolationForest] = None
        self._is_trained = False

    # ── Bootstrap from history ────────────────────────────────────────────
    def bootstrap(self, history: List[dict]) -> None:
        """Seed rolling windows and train Isolation Forest on historical data."""
        rows = []
        for reading in history:
            vec = []
            for f in SENSOR_FIELDS:
                val = reading.get(f)
                if val is not None:
                    self.windows[f].append(val)
                    vec.append(val)
            if len(vec) == len(SENSOR_FIELDS):
                rows.append(vec)

        if len(rows) >= 30:
            X = np.array(rows)
            self.iso_forest = IsolationForest(
                contamination=IF_CONTAMINATION,
                n_estimators=150,
                random_state=42,
                n_jobs=-1,
            )
            self.iso_forest.fit(X)
            self._is_trained = True
            logger.info("[%s] Isolation Forest trained on %d samples", self.machine_id, len(rows))
        else:
            logger.warning("[%s] Not enough history (%d rows) to train IF", self.machine_id, len(rows))

    # ── Z-score check ─────────────────────────────────────────────────────
    def _zscore_anomaly(self, reading: dict) -> Tuple[bool, Dict[str, float]]:
        """Return (is_anomaly, {field: zscore}) using rolling statistics."""
        scores: Dict[str, float] = {}
        any_anomaly = False
        for f in SENSOR_FIELDS:
            val = reading.get(f)
            if val is None:
                continue
            window = self.windows[f]
            if len(window) < 10:
                scores[f] = 0.0
                continue
            arr = np.array(window)
            mu, sigma = arr.mean(), arr.std()
            if sigma < 1e-9:
                sigma = 1e-9
            z = abs((val - mu) / sigma)
            scores[f] = round(z, 3)
            if z > ZSCORE_THRESHOLD:
                any_anomaly = True
        return any_anomaly, scores

    # ── Isolation Forest check ────────────────────────────────────────────
    def _if_anomaly(self, reading: dict) -> Tuple[bool, float]:
        """Return (is_anomaly, anomaly_score) from Isolation Forest."""
        if not self._is_trained or self.iso_forest is None:
            return False, 0.0
        vec = [reading.get(f, 0.0) for f in SENSOR_FIELDS]
        X = np.array([vec])
        pred = self.iso_forest.predict(X)[0]            # -1 = anomaly, 1 = normal
        raw_score = self.iso_forest.decision_function(X)[0]
        # Convert decision_function to probability-like [0,1] — more negative = more anomalous
        score = max(0.0, min(1.0, 0.5 - raw_score))
        return pred == -1, round(score, 4)

    # ── Ensemble decision ─────────────────────────────────────────────────
    def evaluate(self, reading: dict) -> dict:
        """
        Evaluate a single live reading against the baseline.
        Returns:
            {
                "is_anomaly": bool,
                "combined_score": float,       # 0–1
                "zscore_flag": bool,
                "zscores": {field: z},
                "if_flag": bool,
                "if_score": float,
                "deviations": {field: str},    # human-readable
            }
        """
        z_flag, zscores = self._zscore_anomaly(reading)
        if_flag, if_score = self._if_anomaly(reading)

        # Weighted ensemble score
        z_vote = 1.0 if z_flag else 0.0
        if_vote = if_score if self._is_trained else z_vote  # fall back if not trained
        combined = ENSEMBLE_ZSCORE_WEIGHT * z_vote + ENSEMBLE_IF_WEIGHT * if_vote
        is_anomaly = combined >= ANOMALY_SCORE_THRESHOLD

        # Build human-readable deviation summary
        deviations = {}
        for f in SENSOR_FIELDS:
            z = zscores.get(f, 0)
            if z > ZSCORE_THRESHOLD:
                window = self.windows[f]
                mu = np.mean(window) if len(window) else 0
                deviations[f] = f"{reading.get(f)} (z={z:.1f}, baseline_mean={mu:.2f})"

        # Update rolling windows AFTER evaluation so the current reading
        # is compared against the prior window.
        for f in SENSOR_FIELDS:
            val = reading.get(f)
            if val is not None:
                self.windows[f].append(val)

        return {
            "is_anomaly": bool(is_anomaly),
            "combined_score": float(round(combined, 4)),
            "zscore_flag": bool(z_flag),
            "zscores": {k: float(v) for k, v in zscores.items()},
            "if_flag": bool(if_flag),
            "if_score": float(if_score),
            "deviations": deviations,
        }


class AnomalyDetector:
    """Manages baselines for all machines."""

    def __init__(self):
        self.baselines: Dict[str, MachineBaseline] = {}

    def bootstrap(self, history: Dict[str, List[dict]]) -> None:
        for mid, readings in history.items():
            bl = MachineBaseline(mid)
            bl.bootstrap(readings)
            self.baselines[mid] = bl
            logger.info("[%s] Baseline initialised — window size %d", mid, len(bl.windows["temperature_C"]))

    def evaluate(self, machine_id: str, reading: dict) -> dict:
        bl = self.baselines.get(machine_id)
        if bl is None:
            bl = MachineBaseline(machine_id)
            self.baselines[machine_id] = bl
        return bl.evaluate(reading)
