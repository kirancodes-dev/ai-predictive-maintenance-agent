"""
Historical data ingestion — fetches 7-day history for every machine to
bootstrap the anomaly detector baselines.
"""

import logging
import aiohttp
from typing import Dict, List

from config import SIM_BASE_URL, MACHINE_IDS

logger = logging.getLogger("ipma.ingestion")


async def fetch_history(session: aiohttp.ClientSession, machine_id: str) -> List[dict]:
    """Fetch 7-day history for a single machine."""
    url = f"{SIM_BASE_URL}/history/{machine_id}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            resp.raise_for_status()
            payload = await resp.json()
            data = payload.get("data", [])
            logger.info("Fetched %d historical readings for %s", len(data), machine_id)
            return data
    except Exception as exc:
        logger.error("Failed to fetch history for %s: %s", machine_id, exc)
        return []


async def ingest_all(session: aiohttp.ClientSession) -> Dict[str, List[dict]]:
    """Fetch history for every machine concurrently and return {machine_id: [readings]}."""
    import asyncio
    tasks = {mid: fetch_history(session, mid) for mid in MACHINE_IDS}
    results = await asyncio.gather(*tasks.values())
    history = dict(zip(tasks.keys(), results))
    total = sum(len(v) for v in history.values())
    logger.info("Historical ingestion complete — %d total readings across %d machines", total, len(history))
    return history
