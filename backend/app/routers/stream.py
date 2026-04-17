from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from datetime import datetime, timedelta
import random
import httpx
from app.database import get_db
from app.models.sensor import Sensor
from app.models.machine import Machine
from app.models.user import User
from app.schemas.sensor import SensorReadingOut, SensorHistoryOut, SensorDataPoint
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/stream", tags=["stream"])

# Sensor type → simulation server field name
SIM_FIELD_MAP = {
    "temperature": "temperature_C",
    "vibration": "vibration_mm_s",
    "rpm": "rpm",
    "current": "current_A",
}

# Fallback ranges used only when sim server is unreachable
_FALLBACK_RANGES = {
    "temperature": (60.0, 95.0),
    "vibration": (0.1, 5.5),
    "rpm": (900.0, 1800.0),
    "current": (5.0, 25.0),
}


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
    """Fetch the single latest reading from the simulation server."""
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
    limit: int = 500,
) -> list[dict]:
    """Fetch historical readings from the simulation server."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{settings.SIMULATION_SERVER_URL}/history/{machine_id}",
                params={
                    "start": from_dt.isoformat(),
                    "end": to_dt.isoformat(),
                    "limit": limit,
                },
            )
            if resp.status_code == 200:
                return resp.json().get("data", [])
    except Exception:
        pass
    return []


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
        # Fallback: random generation
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
    to_dt = datetime.fromisoformat(to) if to else datetime.utcnow()
    diff_minutes = int((to_dt - from_dt).total_seconds() / 60)
    limit = min(diff_minutes // 5 or 1, 500)

    sim_readings = await _fetch_sim_history(machine_id, from_dt, to_dt, limit)

    histories = []
    if sim_readings:
        # Build one SensorHistoryOut per sensor type from simulation data
        for sensor in sensors:
            field = SIM_FIELD_MAP.get(sensor.type)
            if not field:
                continue
            data_points = [
                SensorDataPoint(timestamp=r["timestamp"], value=float(r[field]))
                for r in sim_readings
                if field in r
            ]
            histories.append(SensorHistoryOut(sensorId=sensor.id, data=data_points))
    else:
        # Fallback: synthetic history
        for sensor in sensors:
            lo, hi = _FALLBACK_RANGES.get(sensor.type, (0.0, 100.0))
            data_points = [
                SensorDataPoint(
                    timestamp=(from_dt + timedelta(minutes=i * 5)).isoformat(),
                    value=round(random.uniform(lo, hi), 2),
                )
                for i in range(limit)
            ]
            histories.append(SensorHistoryOut(sensorId=sensor.id, data=data_points))

    return {"data": histories, "success": True}
