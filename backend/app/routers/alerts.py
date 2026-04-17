from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from datetime import datetime
import math
from app.database import get_db
from app.models.alert import Alert
from app.models.user import User
from app.dependencies import get_current_user, require_operator
from app.core.websocket_manager import ws_manager

router = APIRouter(prefix="/alerts", tags=["alerts"])

VALID_SEVERITIES = {"info", "warning", "error", "critical"}
VALID_MACHINE_IDS = {"CNC_01", "CNC_02", "PUMP_03", "CONVEYOR_04"}
MACHINE_NAMES = {
    "CNC_01": "CNC Machine #1",
    "CNC_02": "CNC Machine #2",
    "PUMP_03": "Pump #3",
    "CONVEYOR_04": "Conveyor #4",
}


class CreateAlertRequest(BaseModel):
    machineId: str
    severity: str
    title: str
    message: str
    sensorId: Optional[str] = None
    value: Optional[float] = None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        if v not in VALID_SEVERITIES:
            raise ValueError(f"severity must be one of {VALID_SEVERITIES}")
        return v

    @field_validator("machineId")
    @classmethod
    def validate_machine(cls, v: str) -> str:
        if v not in VALID_MACHINE_IDS:
            raise ValueError(f"machineId must be one of {VALID_MACHINE_IDS}")
        return v

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 500:
            raise ValueError("title must be between 3 and 500 characters")
        return v

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 2000:
            raise ValueError("message must be between 3 and 2000 characters")
        return v


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


@router.get("/summary")
async def alert_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Quick summary stats for the dashboard."""
    total_r = await db.execute(select(func.count()).select_from(Alert))
    total = total_r.scalar() or 0

    active_r = await db.execute(
        select(func.count()).select_from(
            select(Alert).where(Alert.status == "active").subquery()
        )
    )
    active = active_r.scalar() or 0

    critical_r = await db.execute(
        select(func.count()).select_from(
            select(Alert).where(Alert.severity == "critical", Alert.status == "active").subquery()
        )
    )
    critical = critical_r.scalar() or 0

    acknowledged_r = await db.execute(
        select(func.count()).select_from(
            select(Alert).where(Alert.status == "acknowledged").subquery()
        )
    )
    acknowledged = acknowledged_r.scalar() or 0

    resolved_r = await db.execute(
        select(func.count()).select_from(
            select(Alert).where(Alert.status == "resolved").subquery()
        )
    )
    resolved = resolved_r.scalar() or 0

    # Per-severity breakdown (active only)
    severity_counts = {}
    for sev in VALID_SEVERITIES:
        r = await db.execute(
            select(func.count()).select_from(
                select(Alert).where(Alert.severity == sev, Alert.status == "active").subquery()
            )
        )
        severity_counts[sev] = r.scalar() or 0

    return {
        "data": {
            "total": total,
            "active": active,
            "critical": critical,
            "acknowledged": acknowledged,
            "resolved": resolved,
            "severityCounts": severity_counts,
            "timestamp": datetime.utcnow().isoformat(),
        }
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


@router.post("", dependencies=[Depends(require_operator)])
async def create_alert(
    body: CreateAlertRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an alert manually from the frontend."""
    machine_name = MACHINE_NAMES.get(body.machineId, body.machineId)
    alert = Alert(
        machine_id=body.machineId,
        machine_name=machine_name,
        severity=body.severity,
        status="active",
        title=body.title,
        message=body.message,
        sensor_id=body.sensorId,
        value=body.value,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    alert_dict = _alert_to_dict(alert)

    # Broadcast to all connected WebSocket clients
    await ws_manager.broadcast_all({
        "type": "alert",
        "payload": alert_dict,
    })

    return {"data": alert_dict}


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
    if alert.status == "acknowledged":
        return {"data": _alert_to_dict(alert), "message": "Already acknowledged"}
    if alert.status == "resolved":
        raise HTTPException(status_code=400, detail="Cannot acknowledge a resolved alert")
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = current_user.name
    await db.commit()

    alert_dict = _alert_to_dict(alert)
    await ws_manager.broadcast_all({
        "type": "alert_updated",
        "payload": alert_dict,
    })
    return {"data": alert_dict, "message": "Alert acknowledged successfully"}


@router.patch("/{alert_id}/resolve", dependencies=[Depends(require_operator)])
async def resolve_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status == "resolved":
        return {"data": _alert_to_dict(alert), "message": "Already resolved"}
    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    await db.commit()

    alert_dict = _alert_to_dict(alert)
    await ws_manager.broadcast_all({
        "type": "alert_updated",
        "payload": alert_dict,
    })
    return {"data": alert_dict, "message": "Alert resolved successfully"}
