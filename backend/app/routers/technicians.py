"""
Technicians router — CRUD and availability endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.technician import Technician
from app.models.user import User
from app.dependencies import get_current_user, require_manager

router = APIRouter(prefix="/technicians", tags=["technicians"])


def _tech_to_dict(t: Technician) -> dict:
    now = datetime.utcnow()
    on_shift = _is_on_shift(t, now.hour)
    return {
        "id": t.id,
        "name": t.name,
        "email": t.email,
        "phone": t.phone,
        "specialty": t.specialty,
        "skills": t.skills or [],
        "shiftStartHour": t.shift_start_hour,
        "shiftEndHour": t.shift_end_hour,
        "isAvailable": t.is_available,
        "isOnShift": on_shift,
        "currentAssignmentMachineId": t.current_assignment_machine_id,
        "currentAssignmentMachineName": t.current_assignment_machine_name,
        "assignmentStartedAt": t.assignment_started_at.isoformat() if t.assignment_started_at else None,
        "estimatedFreeAt": t.estimated_free_at.isoformat() if t.estimated_free_at else None,
        "isActive": t.is_active,
    }


def _is_on_shift(t: Technician, now_hour: int) -> bool:
    s, e = t.shift_start_hour, t.shift_end_hour
    if s <= e:
        return s <= now_hour < e
    return now_hour >= s or now_hour < e


@router.get("")
async def list_technicians(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Technician).where(Technician.is_active == True).order_by(Technician.name)
    )
    techs = result.scalars().all()
    return {"data": [_tech_to_dict(t) for t in techs]}


@router.get("/available")
async def list_available_technicians(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return technicians that are both on-shift and available (not currently assigned)."""
    now_hour = datetime.utcnow().hour
    result = await db.execute(
        select(Technician).where(
            Technician.is_active == True,
            Technician.is_available == True,
        )
    )
    techs = result.scalars().all()
    on_shift_available = [t for t in techs if _is_on_shift(t, now_hour)]
    return {"data": [_tech_to_dict(t) for t in on_shift_available]}


@router.get("/{technician_id}")
async def get_technician(
    technician_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Technician).where(Technician.id == technician_id))
    tech = result.scalar_one_or_none()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
    return {"data": _tech_to_dict(tech)}


class AvailabilityUpdate(BaseModel):
    is_available: bool
    current_assignment_machine_id: Optional[str] = None
    current_assignment_machine_name: Optional[str] = None


@router.patch("/{technician_id}/availability")
async def update_availability(
    technician_id: str,
    body: AvailabilityUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Technician).where(Technician.id == technician_id))
    tech = result.scalar_one_or_none()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")

    tech.is_available = body.is_available
    if body.is_available:
        # Freeing up technician
        tech.current_assignment_machine_id = None
        tech.current_assignment_machine_name = None
        tech.assignment_started_at = None
        tech.estimated_free_at = None
    else:
        tech.current_assignment_machine_id = body.current_assignment_machine_id
        tech.current_assignment_machine_name = body.current_assignment_machine_name
        tech.assignment_started_at = datetime.utcnow()

    await db.commit()
    await db.refresh(tech)
    return {"data": _tech_to_dict(tech)}
