from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models.alert import Alert
from app.models.user import User
from app.schemas.alert import AlertOut
from app.schemas.common import PaginatedResponse
from app.dependencies import get_current_user
import math

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=PaginatedResponse[AlertOut])
async def list_alerts(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    severity: Optional[List[str]] = Query(None),
    status: Optional[List[str]] = Query(None),
    machineId: Optional[str] = Query(None),
    frm: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    filters = []
    if severity:
        filters.append(Alert.severity.in_(severity))
    if status:
        filters.append(Alert.status.in_(status))
    if machineId:
        filters.append(Alert.machine_id == machineId)
    if frm:
        filters.append(Alert.timestamp >= datetime.fromisoformat(frm))
    if to:
        filters.append(Alert.timestamp <= datetime.fromisoformat(to))

    where = and_(*filters) if filters else True

    total_result = await db.execute(select(func.count()).select_from(Alert).where(where))
    total = total_result.scalar_one()
    offset = (page - 1) * pageSize
    result = await db.execute(
        select(Alert).where(where).order_by(Alert.timestamp.desc()).offset(offset).limit(pageSize)
    )
    alerts = result.scalars().all()
    return PaginatedResponse(
        items=[AlertOut.from_orm_alert(a) for a in alerts],
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=math.ceil(total / pageSize) if total else 1,
    )


@router.get("/{alert_id}")
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"data": AlertOut.from_orm_alert(alert), "success": True}


@router.post("/{alert_id}/acknowledge")
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
    return {"data": AlertOut.from_orm_alert(alert), "success": True}


@router.post("/{alert_id}/resolve")
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
    return {"data": AlertOut.from_orm_alert(alert), "success": True}
