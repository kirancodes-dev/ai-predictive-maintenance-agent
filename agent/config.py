"""
IPMA Agent Configuration
"""

import os

# ── Simulation Server ─────────────────────────────────────────────────────────
SIM_BASE_URL = os.getenv("SIM_BASE_URL", "http://localhost:3000")

# ── Machines ──────────────────────────────────────────────────────────────────
MACHINE_IDS = ["CNC_01", "CNC_02", "PUMP_03", "CONVEYOR_04"]

# ── Anomaly Detection ────────────────────────────────────────────────────────
ZSCORE_WINDOW = 120            # rolling window size for Z-score (readings)
ZSCORE_THRESHOLD = 3.0         # Z-score above this = anomaly
IF_CONTAMINATION = 0.05        # Isolation Forest contamination parameter
ENSEMBLE_ZSCORE_WEIGHT = 0.4   # weight for Z-score vote
ENSEMBLE_IF_WEIGHT = 0.6       # weight for Isolation Forest vote
ANOMALY_SCORE_THRESHOLD = 0.5  # combined score above this triggers anomaly

# ── Alert Fatigue / Cooldown ─────────────────────────────────────────────────
ALERT_COOLDOWN_SECONDS = int(os.getenv("ALERT_COOLDOWN_SECONDS", "300"))  # 5 min

# ── SSE Reconnection ─────────────────────────────────────────────────────────
BACKOFF_BASE = 1               # initial backoff seconds
BACKOFF_MAX = 60               # max backoff seconds
BACKOFF_FACTOR = 2             # exponential multiplier
JITTER_MAX = 1.0               # random jitter range [0, JITTER_MAX]

# ── Webhook ──────────────────────────────────────────────────────────────────
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "https://hooks.example.com/ipma")

# ── Logging ──────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
