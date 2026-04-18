from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from app.database import get_db
from app.models.machine import Machine
from app.models.sensor import Sensor
from app.models.user import User
from app.dependencies import get_current_user, require_operator

router = APIRouter(prefix="/machines", tags=["machines"])


def _machine_to_dict(m: Machine) -> dict:
    return {
        "id": m.id,
        "name": m.name,
        "model": m.model,
        "location": m.location,
        "status": m.status,
        "riskScore": m.risk_score,
        "riskLevel": m.risk_level,
        "lastSeen": m.last_seen.isoformat() if m.last_seen else None,
        "installDate": m.install_date,
        "nextMaintenanceDate": m.next_maintenance_date,
        "tags": m.tags or [],
        "description": m.description,
        "manufacturer": m.manufacturer,
        "serialNumber": m.serial_number,
        "firmwareVersion": m.firmware_version,
        "createdAt": m.created_at.isoformat() if m.created_at else None,
    }


@router.get("")
async def list_machines(
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None, alias="riskLevel"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Machine)
    if status:
        q = q.where(Machine.status == status)
    if risk_level:
        q = q.where(Machine.risk_level == risk_level)
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar() or 0
    q = q.offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    machines = result.scalars().all()
    import math
    return {
        "data": {
            "items": [_machine_to_dict(m) for m in machines],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": math.ceil(total / limit) if total else 1,
        }
    }


@router.get("/{machine_id}")
async def get_machine(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Machine).where(Machine.id == machine_id))
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return {"data": _machine_to_dict(machine)}


# ── Per-machine threshold management ────────────────────────────────────────


def _sensor_threshold_dict(s: Sensor) -> dict:
    return {
        "id": s.id,
        "sensorType": s.type,
        "name": s.name,
        "unit": s.unit,
        "minThreshold": s.min_threshold,
        "maxThreshold": s.max_threshold,
        "criticalMin": s.critical_min,
        "criticalMax": s.critical_max,
    }


class ThresholdUpdate(BaseModel):
    sensorType: str
    minThreshold: Optional[float] = None
    maxThreshold: Optional[float] = None
    criticalMin: Optional[float] = None
    criticalMax: Optional[float] = None


@router.get("/{machine_id}/thresholds")
async def get_machine_thresholds(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get all sensor thresholds for a specific machine."""
    result = await db.execute(
        select(Sensor).where(Sensor.machine_id == machine_id, Sensor.is_active == True)
    )
    sensors = result.scalars().all()
    return {"data": [_sensor_threshold_dict(s) for s in sensors]}


@router.put("/{machine_id}/thresholds", dependencies=[Depends(require_operator)])
async def update_machine_thresholds(
    machine_id: str,
    updates: List[ThresholdUpdate],
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Update sensor thresholds for a specific machine."""
    # Verify machine exists
    machine_result = await db.execute(select(Machine).where(Machine.id == machine_id))
    if not machine_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Machine not found")

    updated = []
    for upd in updates:
        result = await db.execute(
            select(Sensor).where(
                Sensor.machine_id == machine_id,
                Sensor.type == upd.sensorType,
                Sensor.is_active == True,
            )
        )
        sensor = result.scalar_one_or_none()
        if not sensor:
            continue
        if upd.minThreshold is not None:
            sensor.min_threshold = upd.minThreshold
        if upd.maxThreshold is not None:
            sensor.max_threshold = upd.maxThreshold
        if upd.criticalMin is not None:
            sensor.critical_min = upd.criticalMin
        if upd.criticalMax is not None:
            sensor.critical_max = upd.criticalMax
        updated.append(_sensor_threshold_dict(sensor))

    await db.commit()
    return {"data": updated, "message": f"Updated {len(updated)} sensor thresholds"}
