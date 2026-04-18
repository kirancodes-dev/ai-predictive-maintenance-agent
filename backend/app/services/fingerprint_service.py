"""
Failure Fingerprint Service — compares live sensor readings against known
failure patterns stored in the DB.

How it works:
  1. On each automation cycle, when a machine triggers the two-step ML
     verification, we also run fingerprint comparison.
  2. We load all fingerprints matching the machine's type/tags.
  3. For each fingerprint snapshot, we compute a Z-score distance between
     the machine's current readings and the fingerprint readings.
  4. If the current readings are "close" to any failure fingerprint
     (distance below threshold), the fingerprint match is CONFIRMED.
  5. The result feeds into the two-step verification as an additional factor.

Similarity metric:
  - Normalised Euclidean distance across (temperature, vibration, current).
  - Each feature is normalised by the fingerprint's own value to handle
    different scales (percentage deviation).
  - A match score of 0.0 = identical, 1.0 = very different.
"""

import logging
import math
from typing import List, Optional, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.failure_fingerprint import FailureFingerprint

logger = logging.getLogger("fingerprint_service")

# If the normalised distance is below this, the readings "mirror" the failure
MATCH_THRESHOLD = 0.25  # 25% average deviation → strong match
WARN_THRESHOLD = 0.40   # 40% → approaching failure pattern


def _normalised_distance(
    current: Dict[str, float],
    fingerprint: FailureFingerprint,
) -> float:
    """
    Compute normalised Euclidean distance between current readings and a
    fingerprint.  Each dimension is scaled by the fingerprint value so that
    the distance is unit-less (percentage deviation).
    """
    diffs = []
    pairs = [
        ("temperature", fingerprint.temperature),
        ("vibration", fingerprint.vibration),
        ("current", fingerprint.current),
    ]
    for key, fp_val in pairs:
        cur_val = current.get(key)
        if cur_val is None or fp_val is None or fp_val == 0:
            continue
        # relative deviation
        diffs.append(((cur_val - fp_val) / fp_val) ** 2)

    if not diffs:
        return 1.0  # no data → no match

    return math.sqrt(sum(diffs) / len(diffs))


async def match_fingerprints(
    db: AsyncSession,
    machine_tags: List[str],
    current_readings: Dict[str, float],
    hours_remaining: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Compare current sensor readings against stored failure fingerprints.

    Args:
        db: async DB session
        machine_tags: tags on the machine (e.g. ["cnc", "floor1", "bearing-wear"])
        current_readings: {"temperature": ..., "vibration": ..., "current": ...}
        hours_remaining: predicted hours to failure (used to select time-appropriate fingerprints)

    Returns:
        {
            "matched": bool,          # True if any fingerprint closely matches
            "best_match_distance": float,
            "best_match_label": str,
            "best_match_failure_type": str,
            "matches": [...],         # all matches below WARN_THRESHOLD
            "fingerprints_checked": int,
        }
    """
    if not current_readings:
        return {"matched": False, "fingerprints_checked": 0, "matches": []}

    # Load fingerprints for matching machine types
    # Match any tag that appears in both the machine's tags and fingerprint machine_type
    result = await db.execute(select(FailureFingerprint))
    all_fps = result.scalars().all()

    # Filter to relevant fingerprints (machine_type matches any of the machine's tags)
    tag_set = set(t.lower() for t in (machine_tags or []))
    relevant = [fp for fp in all_fps if fp.machine_type.lower() in tag_set]

    # If hours_remaining is known, prefer fingerprints near that time offset
    # But still check all of them
    if not relevant:
        return {"matched": False, "fingerprints_checked": 0, "matches": []}

    matches = []
    best_dist = float("inf")
    best_fp = None

    for fp in relevant:
        dist = _normalised_distance(current_readings, fp)

        # Time-proximity bonus: if the predicted hours_remaining is close to
        # the fingerprint's hours_before_failure, the match is more significant
        time_bonus = 1.0
        if hours_remaining is not None and fp.hours_before_failure is not None:
            time_diff = abs(hours_remaining - fp.hours_before_failure)
            if time_diff <= 6:
                time_bonus = 0.85  # 15% bonus (lower distance = stronger match)
            elif time_diff <= 12:
                time_bonus = 0.92

        effective_dist = dist * time_bonus

        if effective_dist < WARN_THRESHOLD:
            matches.append({
                "fingerprint_id": fp.id,
                "label": fp.label,
                "failure_type": fp.failure_type,
                "distance": round(effective_dist, 4),
                "raw_distance": round(dist, 4),
                "hours_before_failure": fp.hours_before_failure,
                "machine_type": fp.machine_type,
                "confirmed": effective_dist < MATCH_THRESHOLD,
            })

        if effective_dist < best_dist:
            best_dist = effective_dist
            best_fp = fp

    matched = best_dist < MATCH_THRESHOLD

    result_dict = {
        "matched": matched,
        "best_match_distance": round(best_dist, 4) if best_fp else None,
        "best_match_label": best_fp.label if best_fp else None,
        "best_match_failure_type": best_fp.failure_type if best_fp else None,
        "fingerprints_checked": len(relevant),
        "matches": sorted(matches, key=lambda m: m["distance"]),
    }

    if matched:
        logger.warning(
            "FINGERPRINT MATCH: current readings mirror '%s' (distance=%.3f, type=%s)",
            best_fp.label, best_dist, best_fp.failure_type,
        )
    elif matches:
        logger.info(
            "FINGERPRINT APPROACHING: %d patterns within warn range (best=%.3f '%s')",
            len(matches), best_dist, best_fp.label if best_fp else "?",
        )

    return result_dict
