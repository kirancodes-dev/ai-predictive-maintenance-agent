#!/usr/bin/env python3
"""
IPMA — Intelligent Predictive Maintenance Agent
================================================
Entry point.  Orchestrates:
  1. Historical data ingestion  (baseline)
  2. Concurrent SSE streaming   (4 machines)
  3. Real-time anomaly detection (Z-score + Isolation Forest ensemble)
  4. Automated alerting & maintenance scheduling
  5. Webhook delivery to external notification service
  6. Alert fatigue prevention via state machine + cooldowns
  7. Automatic reconnection with exponential back-off
"""

import asyncio
import logging
import signal
import sys
from datetime import datetime

import aiohttp

from config import MACHINE_IDS, LOG_LEVEL
from ingestion import ingest_all
from anomaly_detector import AnomalyDetector
from alert_manager import AlertManager
from streaming import stream_machine
from actions import post_alert, schedule_maintenance
from webhook import send_webhook

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s │ %(levelname)-7s │ %(name)-20s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("ipma.main")

# ── Globals ───────────────────────────────────────────────────────────────────
detector = AnomalyDetector()
alert_mgr = AlertManager()
_http_session = None
_stop_event = None  # created inside main() to bind to the correct loop

# Counters for summary
_stats = {mid: {"readings": 0, "anomalies": 0, "alerts": 0} for mid in MACHINE_IDS}


# ── Reading handler (called for every SSE reading) ────────────────────────────
async def handle_reading(machine_id: str, reading: dict) -> None:
    """Process a single live reading through the full pipeline."""
    global _http_session
    _stats[machine_id]["readings"] += 1

    # 1. Anomaly detection
    result = detector.evaluate(machine_id, reading)
    is_anomaly = result["is_anomaly"]

    if is_anomaly:
        _stats[machine_id]["anomalies"] += 1
        logger.warning(
            "[%s] ANOMALY score=%.3f  zscores=%s  if_score=%.3f  | temp=%.1f vib=%.2f rpm=%d cur=%.1f",
            machine_id,
            result["combined_score"],
            result["zscores"],
            result["if_score"],
            reading.get("temperature_C", 0),
            reading.get("vibration_mm_s", 0),
            reading.get("rpm", 0),
            reading.get("current_A", 0),
        )

    # 2. Alert fatigue gate
    should_fire = alert_mgr.should_alert(machine_id, is_anomaly)

    if should_fire and _http_session:
        _stats[machine_id]["alerts"] += 1
        reason = _build_reason(machine_id, reading, result)

        # 3. Fire alert + schedule maintenance + webhook concurrently
        await asyncio.gather(
            post_alert(_http_session, machine_id, reading, reason),
            schedule_maintenance(_http_session, machine_id),
            send_webhook(_http_session, machine_id, reading, result),
        )


def _build_reason(machine_id: str, reading: dict, analysis: dict) -> str:
    """Build a human-readable reason string for the alert."""
    devs = analysis.get("deviations", {})
    parts = [f"{k}: {v}" for k, v in devs.items()]
    if parts:
        return f"Anomaly cluster on {machine_id} — {'; '.join(parts)}"
    return (
        f"Anomaly cluster on {machine_id} — "
        f"combined_score={analysis['combined_score']:.3f}, "
        f"temp={reading.get('temperature_C')}, vib={reading.get('vibration_mm_s')}, "
        f"rpm={reading.get('rpm')}, cur={reading.get('current_A')}"
    )


# ── Main ──────────────────────────────────────────────────────────────────────
async def main() -> None:
    global _http_session, _stop_event

    # Create the stop event inside the running loop so it binds correctly
    _stop_event = asyncio.Event()

    logger.info("=" * 72)
    logger.info("  IPMA — Intelligent Predictive Maintenance Agent")
    logger.info("  Starting at %s", datetime.utcnow().isoformat() + "Z")
    logger.info("=" * 72)

    # Register signal handlers via the event loop (safe for asyncio)
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _stop_event.set)

    async with aiohttp.ClientSession() as session:
        _http_session = session

        # ── Phase 1: Historical ingestion ─────────────────────────────────
        logger.info("Phase 1 — Ingesting 7-day historical data…")
        history = await ingest_all(session)

        # ── Phase 2: Bootstrap anomaly detector ──────────────────────────
        logger.info("Phase 2 — Training anomaly detection baselines…")
        detector.bootstrap(history)

        # ── Phase 3: Start concurrent SSE streams ────────────────────────
        logger.info("Phase 3 — Connecting to live SSE streams for %d machines…", len(MACHINE_IDS))
        tasks = [
            asyncio.create_task(
                stream_machine(session, mid, handle_reading, _stop_event),
                name=f"stream-{mid}",
            )
            for mid in MACHINE_IDS
        ]

        logger.info("All streams launched.  Press Ctrl+C to stop.")

        # Wait until stop_event is set (signal or error)
        await _stop_event.wait()

        # Cancel streams
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

        _http_session = None

    # Print summary
    logger.info("=" * 72)
    logger.info("  Session Summary")
    logger.info("-" * 72)
    for mid in MACHINE_IDS:
        s = _stats[mid]
        logger.info("  %-14s  readings: %6d  anomalies: %4d  alerts: %2d",
                     mid, s["readings"], s["anomalies"], s["alerts"])
    logger.info("=" * 72)
    logger.info("IPMA agent stopped.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
