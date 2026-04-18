"""
Alert state management — prevents alert fatigue by enforcing per-machine
cooldowns and requiring machines to return to normal before re-alerting.
"""

import logging
import time
from typing import Dict

from config import ALERT_COOLDOWN_SECONDS

logger = logging.getLogger("ipma.alert_manager")


class MachineAlertState:
    """Tracks alert state for a single machine."""

    def __init__(self, machine_id: str):
        self.machine_id = machine_id
        self.in_alert = False
        self.last_alert_ts: float = 0.0
        self.consecutive_normal: int = 0
        self.consecutive_anomaly: int = 0
        # Require N consecutive normal readings before clearing alert
        self.clear_threshold = 10
        # Require N consecutive anomalous readings before raising alert
        self.raise_threshold = 3

    def update(self, is_anomaly: bool) -> bool:
        """
        Feed a new reading result. Returns True if an alert should be fired NOW.
        """
        now = time.time()

        if is_anomaly:
            self.consecutive_normal = 0
            self.consecutive_anomaly += 1
        else:
            self.consecutive_anomaly = 0
            self.consecutive_normal += 1

        # ── Currently in alert state ──────────────────────────────────────
        if self.in_alert:
            # Machine recovered — allow future alerts
            if self.consecutive_normal >= self.clear_threshold:
                logger.info("[%s] Returned to normal after %d clean readings — alert cleared",
                            self.machine_id, self.consecutive_normal)
                self.in_alert = False
            return False  # never re-alert while already in alert

        # ── Not in alert — check if we should fire ────────────────────────
        if is_anomaly and self.consecutive_anomaly >= self.raise_threshold:
            # Enforce cooldown
            elapsed = now - self.last_alert_ts
            if elapsed < ALERT_COOLDOWN_SECONDS:
                logger.debug("[%s] Anomaly confirmed but cooldown active (%ds remaining)",
                             self.machine_id, int(ALERT_COOLDOWN_SECONDS - elapsed))
                return False

            self.in_alert = True
            self.last_alert_ts = now
            self.consecutive_anomaly = 0
            logger.warning("[%s] *** ALERT TRIGGERED ***", self.machine_id)
            return True

        return False


class AlertManager:
    """Manages alert state for all machines."""

    def __init__(self):
        self.states: Dict[str, MachineAlertState] = {}

    def should_alert(self, machine_id: str, is_anomaly: bool) -> bool:
        state = self.states.get(machine_id)
        if state is None:
            state = MachineAlertState(machine_id)
            self.states[machine_id] = state
        return state.update(is_anomaly)

    def get_state(self, machine_id: str) -> dict:
        s = self.states.get(machine_id)
        if s is None:
            return {"in_alert": False}
        return {
            "in_alert": s.in_alert,
            "last_alert_ts": s.last_alert_ts,
            "consecutive_normal": s.consecutive_normal,
            "consecutive_anomaly": s.consecutive_anomaly,
        }
