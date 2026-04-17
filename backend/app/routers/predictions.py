"""
Predictions router — exposes failure predictions and auto-assignment endpoints.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime, timedelta
import httpx

from app.database import get_db
from app.models.machine import Machine
from app.models.prediction import FailurePrediction
from app.models.user import User
from app.services.prediction_engine import compute_prediction
from app.schemas.common import ApiResponse
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/predictions", tags=["predictions"])


def _pred_to_dict(pred: FailurePrediction) -> dict:
    return {
        "id": pred.id,
        "machineId": pred.machine_id,
        "machineName": pred.machine_name,
        "estimatedHoursRemaining": pred.estimated_hours_remaining,
        "predictedFailureAt": pred.predicted_failure_at.isoformat() if pred.predicted_failure_at else None,
        "confidence": pred.confidence,
        "failureType": pred.failure_type,
        "urgency": pred.urgency,
        "recommendation": pred.recommendation,
        "assignedTechnicianId": pred.assigned_technician_id,
        "assignedTechnicianName": pred.assigned_technician_name,
        "assignedAt": pred.assigned_at.isoformat() if pred.assigned_at else None,
        "workOrderId": pred.auto_work_order_id,
        "notificationsSent": {
            "72h": pred.notified_72h,
            "48h": pred.notified_48h,
            "24h": pred.notified_24h,
            "12h": pred.notified_12h,
            "6h": pred.notified_6h,
            "1h": pred.notified_1h,
        },
        "createdAt": pred.created_at.isoformat() if pred.created_at else None,
        "updatedAt": pred.updated_at.isoformat() if pred.updated_at else None,
    }


@router.get("")
async def list_predictions(
    urgency: Optional[str] = Query(None, description="Filter by urgency: low|medium|high|critical|imminent"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return all active failure predictions (persisted by automation loop)."""
    q = select(FailurePrediction).where(FailurePrediction.is_active == True)
    if urgency:
        q = q.where(FailurePrediction.urgency == urgency)
    q = q.order_by(FailurePrediction.estimated_hours_remaining.asc())
    result = await db.execute(q)
    preds = result.scalars().all()
    return {"data": [_pred_to_dict(p) for p in preds]}


@router.get("/live")
async def live_predictions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Compute on-the-fly predictions for ALL machines (not just at-risk).
    Useful for dashboard overview that shows all machines' health.
    """
    result = await db.execute(select(Machine))
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
        predictions.append(pred)

    # Sort by hours remaining asc (most urgent first)
    predictions.sort(key=lambda p: p["estimated_hours_remaining"])
    return {"data": predictions}


@router.get("/{machine_id}")
async def get_machine_prediction(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return the persisted active prediction for a specific machine."""
    # Check persisted record first
    result = await db.execute(
        select(FailurePrediction).where(
            FailurePrediction.machine_id == machine_id,
            FailurePrediction.is_active == True,
        )
    )
    pred = result.scalar_one_or_none()
    if pred:
        return {"data": _pred_to_dict(pred)}

    # Fall back to live compute
    m_result = await db.execute(select(Machine).where(Machine.id == machine_id))
    machine = m_result.scalar_one_or_none()
    if not machine:
        return {"data": None, "error": "Machine not found"}

    live = compute_prediction(
        machine_id=machine.id,
        machine_name=machine.name,
        risk_score=machine.risk_score,
        tags=machine.tags or [],
        install_date_str=machine.install_date,
        last_maintenance_date_str=machine.next_maintenance_date,
    )
    return {"data": live}
