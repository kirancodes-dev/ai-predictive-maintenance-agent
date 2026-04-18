"""
Third-party webhook integration — sends formatted JSON payloads to an
external service (Slack / Discord / Teams mock) for human notification.
"""

import logging
import json
from datetime import datetime

import aiohttp

from config import WEBHOOK_URL

logger = logging.getLogger("ipma.webhook")


def _build_payload(machine_id: str, reading: dict, analysis: dict) -> dict:
    """Build a structured webhook payload suitable for Slack/Teams/Discord."""
    deviations = analysis.get("deviations", {})
    deviation_lines = [f"  • **{k}**: {v}" for k, v in deviations.items()] or ["  (no specific field deviations)"]

    return {
        "source": "IPMA-Agent",
        "event": "anomaly_alert",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "machine_id": machine_id,
        "severity": "critical",
        "summary": f"🚨 Anomaly detected on **{machine_id}** — automated alert & maintenance scheduled.",
        "reading": {
            "temperature_C": reading.get("temperature_C"),
            "vibration_mm_s": reading.get("vibration_mm_s"),
            "rpm": reading.get("rpm"),
            "current_A": reading.get("current_A"),
            "captured_at": reading.get("timestamp"),
        },
        "analysis": {
            "combined_score": analysis.get("combined_score"),
            "zscore_flag": analysis.get("zscore_flag"),
            "isolation_forest_flag": analysis.get("if_flag"),
            "isolation_forest_score": analysis.get("if_score"),
            "top_zscores": analysis.get("zscores"),
        },
        "deviations": deviation_lines,
        "action_taken": [
            "POST /alert sent to simulation server",
            "POST /schedule-maintenance sent (next morning 08:00 UTC)",
        ],
    }


async def send_webhook(
    session: aiohttp.ClientSession,
    machine_id: str,
    reading: dict,
    analysis: dict,
) -> bool:
    """POST the formatted webhook payload to the configured external URL."""
    payload = _build_payload(machine_id, reading, analysis)

    # Always log the payload so it's visible even if the mock endpoint is unreachable
    logger.info(
        "[WEBHOOK → %s]\n%s",
        WEBHOOK_URL,
        json.dumps(payload, indent=2),
    )

    try:
        async with session.post(
            WEBHOOK_URL,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            if resp.status < 400:
                logger.info("[%s] Webhook delivered (HTTP %d)", machine_id, resp.status)
                return True
            logger.warning("[%s] Webhook returned HTTP %d", machine_id, resp.status)
            return False
    except Exception as exc:
        # Webhook failure is non-fatal — log and continue
        logger.warning("[%s] Webhook delivery failed (non-fatal): %s", machine_id, exc)
        return False
