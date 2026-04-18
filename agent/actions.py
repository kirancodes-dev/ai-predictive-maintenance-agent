"""
Automated actions — POST /alert and POST /schedule-maintenance to the
simulation server when anomalies are confirmed.
"""

import logging
from datetime import datetime, timedelta

import aiohttp

from config import SIM_BASE_URL

logger = logging.getLogger("ipma.actions")


async def post_alert(
    session: aiohttp.ClientSession,
    machine_id: str,
    reading: dict,
    reason: str,
) -> bool:
    """Send an alert to the simulation server's /alert endpoint."""
    payload = {
        "machine_id": machine_id,
        "reason": reason,
        "reading": {
            "temperature_C": reading.get("temperature_C"),
            "vibration_mm_s": reading.get("vibration_mm_s"),
            "rpm": reading.get("rpm"),
            "current_A": reading.get("current_A"),
            "timestamp": reading.get("timestamp"),
        },
        "severity": "critical",
        "source": "IPMA-Agent",
        "alerted_at": datetime.utcnow().isoformat() + "Z",
    }
    try:
        async with session.post(
            f"{SIM_BASE_URL}/alert",
            json=payload,
            timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            resp.raise_for_status()
            body = await resp.json()
            if body.get("success"):
                logger.info("[%s] Alert posted successfully", machine_id)
                return True
            logger.warning("[%s] Alert response: %s", machine_id, body)
            return False
    except Exception as exc:
        logger.error("[%s] Failed to post alert: %s", machine_id, exc)
        return False


async def schedule_maintenance(
    session: aiohttp.ClientSession,
    machine_id: str,
) -> bool:
    """Schedule maintenance for the following morning (next day 08:00)."""
    now = datetime.utcnow()
    # Next morning 08:00
    next_morning = (now + timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)

    payload = {
        "machine_id": machine_id,
        "proposed_slot": next_morning.isoformat() + "Z",
        "priority": "high",
        "reason": "Automated predictive maintenance — anomaly cluster detected by IPMA agent",
        "source": "IPMA-Agent",
        "requested_at": now.isoformat() + "Z",
    }
    try:
        async with session.post(
            f"{SIM_BASE_URL}/schedule-maintenance",
            json=payload,
            timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            resp.raise_for_status()
            body = await resp.json()
            if body.get("success"):
                logger.info("[%s] Maintenance scheduled for %s", machine_id, next_morning.isoformat())
                return True
            logger.warning("[%s] Maintenance response: %s", machine_id, body)
            return False
    except Exception as exc:
        logger.error("[%s] Failed to schedule maintenance: %s", machine_id, exc)
        return False
