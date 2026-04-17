from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.database import get_db
from app.models.machine import Machine
from app.models.user import User
from app.dependencies import get_current_user

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
