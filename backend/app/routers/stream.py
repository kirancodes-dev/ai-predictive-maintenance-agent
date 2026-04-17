from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict, Tuple
from datetime import datetime, timedelta
import random
import statistics
import httpx
from app.database import get_db
from app.models.sensor import Sensor
from app.models.user import User
from app.schemas.sensor import SensorReadingOut, SensorHistoryOut, SensorDataPoint
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/stream", tags=["stream"])

# Sensor type → simulation server field name
SIM_FIELD_MAP: Dict[str, str] = {
    "temperature": "temperature_C",
    "vibration": "vibration_mm_s",
    "rpm": "rpm",
    "current": "current_A",
}

# Fallback ranges when sim server is unreachable
_FALLBACK_RANGES: Dict[str, Tuple[float, float]] = {
    "temperature": (60.0, 95.0),
    "vibration": (0.1, 5.5),
    "rpm": (900.0, 1800.0),
    "current": (5.0, 25.0),
}

# In-memory baseline cache: machine_id → (computed_at, result)
_baseline_cache: Dict[str, Tuple[datetime, dict]] = {}
_BASELINE_CACHE_TTL_SEC = 600  # 10 minutes


# ── Sim-server helpers ───────────────────────────────────────────────────────

def _sim_reading_to_sensors(
    sim: dict, sensors: List[Sensor], machine_id: str
) -> List[SensorReadingOut]:
    ts = sim.get("timestamp", datetime.utcnow().isoformat())
    readings = []
    for sensor in sensors:
        field = SIM_FIELD_MAP.get(sensor.type)
        if field and field in sim:
            value = float(sim[field])
        else:
            lo, hi = _FALLBACK_RANGES.get(sensor.type, (0.0, 100.0))
            value = round(random.uniform(lo, hi), 2)
        is_anomaly = value > sensor.critical_max or value < sensor.critical_min
        readings.append(SensorReadingOut(
            sensorId=sensor.id,
            machineId=machine_id,
            type=sensor.type,
            value=round(value, 2),
            unit=sensor.unit,
            timestamp=ts,
            isAnomaly=is_anomaly,
        ))
    return readings


async def _fetch_sim_latest(machine_id: str) -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{settings.SIMULATION_SERVER_URL}/history/{machine_id}",
                params={"limit": 1},
            )
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                return data[-1] if data else None
    except Exception:
        return None


async def _fetch_sim_history(
    machine_id: str,
    from_dt: datetime,
    to_dt: datetime,
    limit: Optional[int] = None,
) -> List[dict]:
    """Fetch historical readings from the simulation server.
    If limit is None, all readings in the date range are returned."""
    try:
        params: dict = {
            "start": from_dt.isoformat(),
            "end": to_dt.isoformat(),
        }
        if limit is not None:
            params["limit"] = limit
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{settings.SIMULATION_SERVER_URL}/history/{machine_id}",
                params=params,
            )
            if resp.status_code == 200:
                return resp.json().get("data", [])
    except Exception:
        pass
    return []


# ── Baseline statistics ──────────────────────────────────────────────────────

def _compute_sensor_baseline(
    baseline_vals: List[float],
    recent_vals: List[float],
) -> dict:
    """Compute statistical thresholds from the baseline window (first 20% of 7-day data)
    and trend from comparing baseline mean against recent window mean."""
    n = len(baseline_vals)
    if n < 2:
        return {}

    mean = statistics.mean(baseline_vals)
    stdev = statistics.stdev(baseline_vals)

    sorted_vals = sorted(baseline_vals)
    p5  = sorted_vals[max(0, int(n * 0.05))]
    p25 = sorted_vals[max(0, int(n * 0.25))]
    p75 = sorted_vals[min(n - 1, int(n * 0.75))]
    p95 = sorted_vals[min(n - 1, int(n * 0.95))]
    iqr = p75 - p25

    # Warning  = mean ± 2σ  (clipped by percentiles for outlier robustness)
    # Critical = mean ± 3σ
    warning_max  = min(mean + 2 * stdev, p95 + iqr * 0.5)
    critical_max = mean + 3 * stdev
    warning_min  = max(mean - 2 * stdev, p5 - iqr * 0.5)
    critical_min = mean - 3 * stdev

    # Trend: compare baseline mean to recent mean
    recent_mean = statistics.mean(recent_vals) if recent_vals else mean
    trend_pct = round((recent_mean - mean) / mean * 100, 1) if mean != 0 else 0.0
    if trend_pct > 5:
        trend = "increasing"
    elif trend_pct < -5:
        trend = "decreasing"
    else:
        trend = "stable"

    return {
        "mean":         round(mean, 3),
        "std":          round(stdev, 3),
        "min":          round(sorted_vals[0], 3),
        "max":          round(sorted_vals[-1], 3),
        "p5":           round(p5, 3),
        "p95":          round(p95, 3),
        "warningMin":   round(warning_min, 3),
        "warningMax":   round(warning_max, 3),
        "criticalMin":  round(critical_min, 3),
        "criticalMax":  round(critical_max, 3),
        "recentMean":   round(recent_mean, 3),
        "trend":        trend,
        "trendPct":     trend_pct,
        "sampleCount":  n,
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/{machine_id}/baseline")
async def get_baseline(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Auto-compute statistical baselines from 7-day simulation history.
    Uses the first 20 % of data as the clean reference window and the last
    10 % as the recent-trend window.  Results are cached for 10 minutes."""

    # Serve from cache if fresh
    cached = _baseline_cache.get(machine_id)
    if cached:
        cached_at, result = cached
        if (datetime.utcnow() - cached_at).total_seconds() < _BASELINE_CACHE_TTL_SEC:
            return {"data": result, "success": True, "cached": True}

    # Verify machine has sensors
    sensor_result = await db.execute(
        select(Sensor).where(Sensor.machine_id == machine_id, Sensor.is_active == True)
    )
    sensors = sensor_result.scalars().all()
    if not sensors:
        raise HTTPException(status_code=404, detail="No sensors found for machine")

    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)

    # Fetch baseline window: first ~1.4 days (20% of 7 days)
    baseline_end = seven_days_ago + timedelta(days=1, hours=10)
    baseline_data = await _fetch_sim_history(machine_id, seven_days_ago, baseline_end)

    # Fetch recent window: last ~16.8 h (10% of 7 days)
    recent_start = now - timedelta(hours=17)
    recent_data  = await _fetch_sim_history(machine_id, recent_start, now)

    sensor_baselines: dict = {}
    for s_type, field in SIM_FIELD_MAP.items():
        b_vals = [float(r[field]) for r in baseline_data if field in r]
        r_vals = [float(r[field]) for r in recent_data   if field in r]

        if len(b_vals) < 10:
            # Not enough history — fall back to sensor DB thresholds
            sensor = next((s for s in sensors if s.type == s_type), None)
            if sensor:
                mid = (sensor.min_threshold + sensor.max_threshold) / 2
                sensor_baselines[s_type] = {
                    "mean":        round(mid, 3),
                    "std":         round((sensor.max_threshold - sensor.min_threshold) / 6, 3),
                    "min":         sensor.critical_min,
                    "max":         sensor.critical_max,
                    "p5":          sensor.critical_min,
                    "p95":         sensor.critical_max,
                    "warningMin":  sensor.min_threshold,
                    "warningMax":  sensor.max_threshold,
                    "criticalMin": sensor.critical_min,
                    "criticalMax": sensor.critical_max,
                    "recentMean":  round(mid, 3),
                    "trend":       "stable",
                    "trendPct":    0.0,
                    "sampleCount": 0,
                    "source":      "db_fallback",
                }
            continue

        bl = _compute_sensor_baseline(b_vals, r_vals)
        bl["source"] = "computed"
        sensor_baselines[s_type] = bl

    # Overall health: % of recent readings within warning bands
    health_scores: List[float] = []
    for s_type, field in SIM_FIELD_MAP.items():
        bl = sensor_baselines.get(s_type)
        if not bl:
            continue
        r_vals = [float(r[field]) for r in recent_data if field in r]
        if r_vals:
            in_bounds = sum(
                1 for v in r_vals if bl["warningMin"] <= v <= bl["warningMax"]
            )
            health_scores.append(in_bounds / len(r_vals))

    overall_health = (
        round(sum(health_scores) / len(health_scores) * 100, 1)
        if health_scores else 100.0
    )

    result = {
        "machineId":              machine_id,
        "computedAt":             now.isoformat(),
        "baselineWindowReadings": len(baseline_data),
        "recentWindowReadings":   len(recent_data),
        "sensors":                sensor_baselines,
        "overallHealthScore":     overall_health,
    }

    _baseline_cache[machine_id] = (now, result)
    return {"data": result, "success": True, "cached": False}


@router.get("/{machine_id}/latest")
@router.get("/{machine_id}/live")
async def get_live_data(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Sensor).where(Sensor.machine_id == machine_id, Sensor.is_active == True)
    )
    sensors = result.scalars().all()
    if not sensors:
        raise HTTPException(status_code=404, detail="No sensors found for machine")

    sim = await _fetch_sim_latest(machine_id)
    if sim:
        readings = _sim_reading_to_sensors(sim, sensors, machine_id)
    else:
        readings = []
        for sensor in sensors:
            lo, hi = _FALLBACK_RANGES.get(sensor.type, (0.0, 100.0))
            value = round(random.uniform(lo, hi), 2)
            is_anomaly = value > sensor.critical_max or value < sensor.critical_min
            readings.append(SensorReadingOut(
                sensorId=sensor.id,
                machineId=machine_id,
                type=sensor.type,
                value=value,
                unit=sensor.unit,
                timestamp=datetime.utcnow().isoformat(),
                isAnomaly=is_anomaly,
            ))

    return {"data": readings, "success": True}


@router.get("/{machine_id}/history")
async def get_history(
    machine_id: str,
    frm: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Sensor).where(Sensor.machine_id == machine_id, Sensor.is_active == True)
    )
    sensors = result.scalars().all()
    if not sensors:
        raise HTTPException(status_code=404, detail="No sensors found for machine")

    from_dt = datetime.fromisoformat(frm) if frm else datetime.utcnow() - timedelta(hours=24)
    to_dt   = datetime.fromisoformat(to)   if to   else datetime.utcnow()
    diff_minutes = int((to_dt - from_dt).total_seconds() / 60)
    limit = min(diff_minutes // 5 or 1, 500)

    sim_readings = await _fetch_sim_history(machine_id, from_dt, to_dt, limit)

    histories = []
    if sim_readings:
        for sensor in sensors:
            field = SIM_FIELD_MAP.get(sensor.type)
            if not field:
                continue
            data_points = [
                SensorDataPoint(timestamp=r["timestamp"], value=float(r[field]))
                for r in sim_readings if field in r
            ]
            histories.append(SensorHistoryOut(
                sensorId=sensor.id, machineId=machine_id,
                type=sensor.type, unit=sensor.unit, data=data_points,
            ))
    else:
        for sensor in sensors:
            lo, hi = _FALLBACK_RANGES.get(sensor.type, (0.0, 100.0))
            data_points = [
                SensorDataPoint(
                    timestamp=(from_dt + timedelta(minutes=i * 5)).isoformat(),
                    value=round(random.uniform(lo, hi), 2),
                )
                for i in range(limit)
            ]
            histories.append(SensorHistoryOut(
                sensorId=sensor.id, machineId=machine_id,
                type=sensor.type, unit=sensor.unit, data=data_points,
            ))

    return {"data": histories, "success": True}
