from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from datetime import datetime
import math
from app.database import get_db
from app.models.alert import Alert
from app.models.user import User
from app.dependencies import get_current_user, require_operator

router = APIRouter(prefix="/alerts", tags=["alerts"])


def _alert_to_dict(a: Alert) -> dict:
    return {
        "id": a.id,
        "machineId": a.machine_id,
        "machineName": a.machine_name,
        "severity": a.severity,
        "status": a.status,
        "title": a.title,
        "message": a.message,
        "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        "acknowledgedAt": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
        "resolvedAt": a.resolved_at.isoformat() if a.resolved_at else None,
        "acknowledgedBy": a.acknowledged_by,
        "sensorId": a.sensor_id,
        "value": a.value,
    }


@router.get("")
async def list_alerts(
    status: Optional[List[str]] = Query(None),
    severity: Optional[str] = Query(None),
    machine_id: Optional[str] = Query(None, alias="machineId"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Alert).order_by(Alert.timestamp.desc())
    if status:
        q = q.where(Alert.status.in_(status))
    if severity:
        q = q.where(Alert.severity == severity)
    if machine_id:
        q = q.where(Alert.machine_id == machine_id)
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar() or 0
    q = q.offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    alerts = result.scalars().all()
    return {
        "data": {
            "items": [_alert_to_dict(a) for a in alerts],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": math.ceil(total / limit) if total else 1,
        }
    }


@router.patch("/{alert_id}/acknowledge", dependencies=[Depends(require_operator)])
async def acknowledge_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = current_user.name
    await db.commit()
    return {"data": _alert_to_dict(alert)}


@router.patch("/{alert_id}/resolve", dependencies=[Depends(require_operator)])
async def resolve_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    await db.commit()
    return {"data": _alert_to_dict(alert)}
