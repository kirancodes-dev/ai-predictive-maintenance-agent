from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime, timedelta
import random
import math
from app.database import get_db
from app.models.maintenance import MaintenanceRecord
from app.models.machine import Machine
from app.models.user import User
from app.schemas.maintenance import (
    MaintenanceOut,
    MaintenanceCreateRequest,
    MaintenanceUpdateRequest,
    FailurePredictionOut,
)
from app.schemas.common import PaginatedResponse, ApiResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("/predictions")
async def get_predictions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Machine).where(Machine.status.in_(["warning", "critical"])).limit(10)
    )
    machines = result.scalars().all()

    failure_types = [
        "Bearing failure", "Overheating", "Vibration anomaly",
        "Pressure drop", "Motor degradation", "Lubrication failure"
    ]
    recommendations = [
        "Schedule immediate inspection",
        "Replace worn components",
        "Increase lubrication frequency",
        "Check cooling system",
        "Inspect motor windings",
        "Run diagnostic test",
    ]
    predictions = []
    for m in machines:
        days_ahead = random.randint(3, 30)
        confidence = round(random.uniform(0.65, 0.98), 2)
        urgency = "critical" if days_ahead <= 7 else "high" if days_ahead <= 14 else "medium"
        predictions.append(
            FailurePredictionOut(
                machineId=m.id,
                machineName=m.name,
                predictedFailureDate=(datetime.utcnow() + timedelta(days=days_ahead)).isoformat(),
                confidence=confidence,
                failureType=random.choice(failure_types),
                recommendation=random.choice(recommendations),
                urgency=urgency,
            )
        )
    return {"data": predictions, "success": True}


@router.get("")
async def list_maintenance(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    machineId: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy import and_
    filters = []
    if machineId:
        filters.append(MaintenanceRecord.machine_id == machineId)
    if status:
        filters.append(MaintenanceRecord.status == status)
    where = and_(*filters) if filters else True

    total_result = await db.execute(
        select(func.count()).select_from(MaintenanceRecord).where(where)
    )
    total = total_result.scalar_one()
    offset = (page - 1) * pageSize
    result = await db.execute(
        select(MaintenanceRecord)
        .where(where)
        .order_by(MaintenanceRecord.scheduled_date.desc())
        .offset(offset)
        .limit(pageSize)
    )
    records = result.scalars().all()
    return PaginatedResponse(
        items=[MaintenanceOut.from_orm(r) for r in records],
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=math.ceil(total / pageSize) if total else 1,
    )


@router.post("")
async def schedule_maintenance(
    body: MaintenanceCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    machine_result = await db.execute(select(Machine).where(Machine.id == body.machineId))
    machine = machine_result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    record = MaintenanceRecord(
        machine_id=body.machineId,
        machine_name=machine.name,
        type=body.type,
        title=body.title,
        description=body.description,
        scheduled_date=body.scheduledDate,
        assigned_to=body.assignedTo,
        estimated_duration=body.estimatedDuration,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return {"data": MaintenanceOut.from_orm(record), "success": True}


@router.get("/{record_id}")
async def get_maintenance(
    record_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(MaintenanceRecord).where(MaintenanceRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"data": MaintenanceOut.from_orm(record), "success": True}


@router.patch("/{record_id}")
async def update_maintenance(
    record_id: str,
    body: MaintenanceUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(MaintenanceRecord).where(MaintenanceRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    update_data = body.model_dump(exclude_none=True)
    field_map = {
        "machineId": "machine_id", "scheduledDate": "scheduled_date",
        "completedDate": "completed_date", "assignedTo": "assigned_to",
        "estimatedDuration": "estimated_duration", "actualDuration": "actual_duration",
        "partsReplaced": "parts_replaced",
    }
    for key, value in update_data.items():
        db_key = field_map.get(key, key)
        setattr(record, db_key, value)
    await db.commit()
    await db.refresh(record)
    return {"data": MaintenanceOut.from_orm(record), "success": True}


@router.delete("/{record_id}")
async def delete_maintenance(
    record_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(MaintenanceRecord).where(MaintenanceRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    await db.delete(record)
    await db.commit()
    return {"success": True, "message": "Deleted"}
