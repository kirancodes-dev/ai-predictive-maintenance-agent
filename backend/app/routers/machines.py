from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.database import get_db
from app.models.machine import Machine
from app.models.sensor import Sensor
from app.models.maintenance import MaintenanceRecord
from app.schemas.machine import MachineOut, MachineDetailOut, RiskOut
from app.schemas.sensor import SensorOut
from app.schemas.common import ApiResponse, PaginatedResponse
from app.dependencies import get_current_user
from app.models.user import User
import math

router = APIRouter(prefix="/machines", tags=["machines"])


@router.get("", response_model=PaginatedResponse[MachineOut])
async def list_machines(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    offset = (page - 1) * pageSize
    total_result = await db.execute(select(func.count()).select_from(Machine))
    total = total_result.scalar_one()
    result = await db.execute(select(Machine).offset(offset).limit(pageSize))
    machines = result.scalars().all()
    items = [MachineOut.from_orm_machine(m) for m in machines]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=math.ceil(total / pageSize) if total else 1,
    )


@router.get("/{machine_id}/risk")
async def get_machine_risk(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Machine).where(Machine.id == machine_id))
    machine = result.scalar_one_or_none()
    if not machine:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Machine not found")
    return {"data": RiskOut(score=machine.risk_score, level=machine.risk_level), "success": True}


@router.get("/{machine_id}/sensors")
async def get_machine_sensors(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Sensor).where(Sensor.machine_id == machine_id))
    sensors = result.scalars().all()
    return {"data": [SensorOut.from_orm_sensor(s) for s in sensors], "success": True}


@router.get("/{machine_id}")
async def get_machine(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Machine).where(Machine.id == machine_id))
    machine = result.scalar_one_or_none()
    if not machine:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Machine not found")
    sensor_result = await db.execute(select(Sensor.id).where(Sensor.machine_id == machine_id))
    sensor_ids = [r[0] for r in sensor_result.all()]
    maint_result = await db.execute(
        select(MaintenanceRecord.id).where(MaintenanceRecord.machine_id == machine_id)
    )
    maint_ids = [r[0] for r in maint_result.all()]
    return {
        "data": MachineDetailOut.from_orm_machine(machine, sensor_ids, maint_ids),
        "success": True,
    }
