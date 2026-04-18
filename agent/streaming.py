"""
SSE streaming with automatic reconnection and exponential backoff.
Connects to /stream/{machine_id} and feeds readings to the anomaly pipeline.
"""

import asyncio
import json
import logging
import random
from typing import Callable, Awaitable

import aiohttp

from config import (
    SIM_BASE_URL,
    BACKOFF_BASE,
    BACKOFF_MAX,
    BACKOFF_FACTOR,
    JITTER_MAX,
)

logger = logging.getLogger("ipma.streaming")


async def _connect_sse(
    session: aiohttp.ClientSession,
    machine_id: str,
    on_reading: Callable[[str, dict], Awaitable[None]],
    stop_event: asyncio.Event,
) -> None:
    """
    Single SSE connection attempt.  Reads lines and dispatches parsed
    JSON readings to the callback.  Raises on disconnect / error.
    """
    url = f"{SIM_BASE_URL}/stream/{machine_id}"
    async with session.get(url, timeout=aiohttp.ClientTimeout(total=None)) as resp:
        resp.raise_for_status()
        logger.info("[%s] SSE connected", machine_id)

        async for raw_line in resp.content:
            if stop_event.is_set():
                return
            line = raw_line.decode("utf-8", errors="replace").strip()
            if not line:
                continue
            if line.startswith("data:"):
                data_str = line[len("data:"):].strip()
                if not data_str:
                    continue
                try:
                    reading = json.loads(data_str)
                    await on_reading(machine_id, reading)
                except json.JSONDecodeError:
                    logger.debug("[%s] Skipping non-JSON SSE line", machine_id)


async def stream_machine(
    session: aiohttp.ClientSession,
    machine_id: str,
    on_reading: Callable[[str, dict], Awaitable[None]],
    stop_event: asyncio.Event,
) -> None:
    """
    Resilient SSE consumer — reconnects with exponential back-off + jitter
    whenever the connection drops.
    """
    attempt = 0
    while not stop_event.is_set():
        try:
            await _connect_sse(session, machine_id, on_reading, stop_event)
            # Clean exit (e.g., stop_event set)
            return
        except asyncio.CancelledError:
            logger.info("[%s] Stream cancelled", machine_id)
            return
        except Exception as exc:
            attempt += 1
            delay = min(BACKOFF_MAX, BACKOFF_BASE * (BACKOFF_FACTOR ** (attempt - 1)))
            jitter = random.uniform(0, JITTER_MAX)
            wait = delay + jitter
            logger.warning(
                "[%s] SSE disconnected (%s). Reconnecting in %.1fs (attempt %d)…",
                machine_id, exc, wait, attempt,
            )
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=wait)
                return  # stop requested during backoff
            except asyncio.TimeoutError:
                pass  # backoff expired, retry

    logger.info("[%s] Stream loop exited", machine_id)
