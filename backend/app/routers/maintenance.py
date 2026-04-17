from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime, timedelta
import math
from app.database import get_db
from app.models.maintenance import MaintenanceRecord
from app.models.machine import Machine
from app.models.user import User
from app.schemas.maintenance import MaintenanceCreateRequest, MaintenanceUpdateRequest
from app.dependencies import get_current_user, require_manager, require_technician

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


def _record_to_dict(r: MaintenanceRecord) -> dict:
    return {
        "id": r.id,
        "machineId": r.machine_id,
        "machineName": r.machine_name,
        "type": r.type,
        "status": r.status,
        "title": r.title,
        "description": r.description,
        "scheduledDate": r.scheduled_date,
        "completedDate": r.completed_date,
        "assignedTo": r.assigned_to,
        "estimatedDuration": r.estimated_duration,
        "actualDuration": r.actual_duration,
        "cost": r.cost,
        "notes": r.notes,
        "partsReplaced": r.parts_replaced or [],
        "createdAt": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("")
async def list_maintenance(
    machine_id: Optional[str] = Query(None, alias="machineId"),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(MaintenanceRecord).order_by(MaintenanceRecord.scheduled_date.desc())
    if machine_id:
        q = q.where(MaintenanceRecord.machine_id == machine_id)
    if status:
        q = q.where(MaintenanceRecord.status == status)
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar() or 0
    q = q.offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    records = result.scalars().all()
    return {
        "data": {
            "items": [_record_to_dict(r) for r in records],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": math.ceil(total / limit) if total else 1,
        }
    }


@router.post("", dependencies=[Depends(require_technician)])
async def create_maintenance(
    body: MaintenanceCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    m_result = await db.execute(select(Machine).where(Machine.id == body.machineId))
    machine = m_result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    record = MaintenanceRecord(
        machine_id=body.machineId,
        machine_name=machine.name,
        type=body.type,
        status="scheduled",
        title=body.title,
        description=body.description,
        scheduled_date=body.scheduledDate,
        assigned_to=body.assignedTo,
        estimated_duration=body.estimatedDuration,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return {"data": _record_to_dict(record)}


@router.patch("/{record_id}", dependencies=[Depends(require_technician)])
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
    if body.status is not None:
        record.status = body.status
    if body.completedDate is not None:
        record.completed_date = body.completedDate
    if body.actualDuration is not None:
        record.actual_duration = body.actualDuration
    if body.cost is not None:
        record.cost = body.cost
    if body.notes is not None:
        record.notes = body.notes
    await db.commit()
    return {"data": _record_to_dict(record)}


@router.get("/predictions")
async def get_predictions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Legacy endpoint — proxies to the new predictions engine."""
    from app.services.prediction_engine import compute_prediction
    result = await db.execute(
        select(Machine).where(Machine.status.in_(["warning", "critical"])).limit(10)
    )
    machines = result.scalars().all()
    predictions = []
    for m in machines:
        pred = compute_prediction(
            machine_id=m.id,
            machine_name=m.name,
            risk_score=m.risk_score,
            tags=m.tags or [],
            install_date_str=m.install_date,
            last_maintenance_date_str=m.next_maintenance_date,
        )
        predictions.append({
            "machineId": pred["machine_id"],
            "machineName": pred["machine_name"],
            "predictedFailureDate": pred["predicted_failure_at"],
            "confidence": pred["confidence"],
            "failureType": pred["failure_type"],
            "recommendation": pred["recommendation"],
            "urgency": pred["urgency"],
            "estimatedHoursRemaining": pred["estimated_hours_remaining"],
        })
    return {"data": predictions}
