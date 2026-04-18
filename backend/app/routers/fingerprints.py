"""
Failure Fingerprint API — view, add, and delete known failure patterns.

These are the sensor-reading snapshots from previously failed systems.
The automation loop compares live readings against these fingerprints to
strengthen (or reject) failure predictions.
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.failure_fingerprint import FailureFingerprint

router = APIRouter(prefix="/fingerprints", tags=["fingerprints"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class FingerprintCreate(BaseModel):
    machine_type: str = Field(..., description="Machine type tag (cnc, pump, conveyor, etc.)")
    label: str = Field(..., description="Human-readable label for this failure event")
    failure_type: str = Field(..., description="Failure category (bearing-wear, thermal-runaway, cavitation, belt-slip)")
    temperature: float
    vibration: float
    current: float
    rpm: Optional[float] = None
    hours_before_failure: float = Field(0.0, description="Hours before the actual failure this snapshot was taken (0 = at failure)")
    source: str = Field("manual", description="Source of this fingerprint (manual, historical, seed)")


class FingerprintOut(BaseModel):
    id: str
    machine_type: str
    label: str
    failure_type: str
    temperature: float
    vibration: float
    current: float
    rpm: Optional[float]
    hours_before_failure: float
    source: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True


class FingerprintCompareRequest(BaseModel):
    """Compare current readings against stored fingerprints."""
    machine_tags: List[str] = Field(..., description="Tags of the machine to match against")
    temperature: float
    vibration: float
    current: float
    hours_remaining: Optional[float] = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[FingerprintOut])
async def list_fingerprints(
    machine_type: Optional[str] = None,
    failure_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all stored failure fingerprints, optionally filtered."""
    query = select(FailureFingerprint)
    if machine_type:
        query = query.where(FailureFingerprint.machine_type == machine_type.lower())
    if failure_type:
        query = query.where(FailureFingerprint.failure_type == failure_type.lower())
    query = query.order_by(FailureFingerprint.machine_type, FailureFingerprint.label, FailureFingerprint.hours_before_failure.desc())
    result = await db.execute(query)
    fps = result.scalars().all()
    return [
        FingerprintOut(
            id=fp.id,
            machine_type=fp.machine_type,
            label=fp.label,
            failure_type=fp.failure_type,
            temperature=fp.temperature,
            vibration=fp.vibration,
            current=fp.current,
            rpm=fp.rpm,
            hours_before_failure=fp.hours_before_failure,
            source=fp.source,
            created_at=fp.created_at.isoformat() if fp.created_at else None,
        )
        for fp in fps
    ]


@router.post("", response_model=FingerprintOut, status_code=201)
async def create_fingerprint(
    body: FingerprintCreate,
    db: AsyncSession = Depends(get_db),
):
    """Manually add a failure fingerprint (known failure pattern)."""
    fp = FailureFingerprint(
        machine_type=body.machine_type.lower(),
        label=body.label,
        failure_type=body.failure_type.lower(),
        temperature=body.temperature,
        vibration=body.vibration,
        current=body.current,
        rpm=body.rpm,
        hours_before_failure=body.hours_before_failure,
        source=body.source,
    )
    db.add(fp)
    await db.commit()
    await db.refresh(fp)
    return FingerprintOut(
        id=fp.id,
        machine_type=fp.machine_type,
        label=fp.label,
        failure_type=fp.failure_type,
        temperature=fp.temperature,
        vibration=fp.vibration,
        current=fp.current,
        rpm=fp.rpm,
        hours_before_failure=fp.hours_before_failure,
        source=fp.source,
        created_at=fp.created_at.isoformat() if fp.created_at else None,
    )


@router.post("/compare")
async def compare_readings(
    body: FingerprintCompareRequest,
    db: AsyncSession = Depends(get_db),
):
    """Compare given sensor readings against stored failure fingerprints."""
    from app.services.fingerprint_service import match_fingerprints

    result = await match_fingerprints(
        db=db,
        machine_tags=body.machine_tags,
        current_readings={
            "temperature": body.temperature,
            "vibration": body.vibration,
            "current": body.current,
        },
        hours_remaining=body.hours_remaining,
    )
    return result


@router.delete("/{fingerprint_id}", status_code=204)
async def delete_fingerprint(
    fingerprint_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a specific failure fingerprint."""
    result = await db.execute(
        select(FailureFingerprint).where(FailureFingerprint.id == fingerprint_id)
    )
    fp = result.scalar_one_or_none()
    if not fp:
        raise HTTPException(status_code=404, detail="Fingerprint not found")
    await db.delete(fp)
    await db.commit()
