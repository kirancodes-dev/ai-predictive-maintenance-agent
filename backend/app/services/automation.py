"""
Automation Loop — runs as a persistent background asyncio task.

Every POLL_INTERVAL_SECONDS it:
  1. Loads all machines from the DB
  2. Computes / refreshes failure predictions
  3. Checks notification milestones (72h, 48h, 24h, 12h, 6h, 1h before failure)
  4. Auto-assigns the best available technician when urgency >= high and no assignment yet
  5. Auto-creates a maintenance work-order if none exists
  6. Broadcasts WebSocket messages to all connected clients:
       - failure_prediction  (every cycle)
       - pre_failure_alert   (at each notification milestone, once only)
       - technician_assigned (when auto-assignment happens)
       - anomaly_flagged     (if risk jumped significantly since last check)
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.machine import Machine
from app.models.technician import Technician
from app.models.prediction import FailurePrediction
from app.models.maintenance import MaintenanceRecord
from app.models.alert import Alert
from app.services.prediction_engine import compute_prediction
from app.core.websocket_manager import ws_manager
from app.services.notification_service import notify_pre_failure_alert, notify_technician_assigned

logger = logging.getLogger("automation")

POLL_INTERVAL_SECONDS = 30  # check every 30 seconds
RISK_THRESHOLD_FOR_PREDICTION = 20  # only track machines with risk >= this

# milestones (hours before failure) where we send a pre_failure_alert
NOTIFICATION_MILESTONES = [
    (72, "notified_72h"),
    (48, "notified_48h"),
    (24, "notified_24h"),
    (12, "notified_12h"),
    (6,  "notified_6h"),
    (1,  "notified_1h"),
]


# ── Technician matching ─────────────────────────────────────────────────────

async def _find_available_technician(
    db: AsyncSession, machine_tags: list
) -> Optional[Technician]:
    """
    Return the best available technician:
      1. Skilled for this machine type (tag match)
      2. Currently on shift (UTC hour within shift window)
      3. Not busy (is_available == True)
    Falls back to any available technician if no skill match.
    """
    now_hour = datetime.utcnow().hour
    result = await db.execute(
        select(Technician).where(
            Technician.is_active == True,
            Technician.is_available == True,
        )
    )
    available = result.scalars().all()

    # Filter to on-shift technicians
    on_shift = [
        t for t in available
        if _is_on_shift(t, now_hour)
    ]
    candidates = on_shift if on_shift else available  # fallback: off-shift but available

    if not candidates:
        return None

    # Prefer skill match
    machine_tag_set = set(machine_tags or [])
    for tech in candidates:
        tech_skills = set(tech.skills or [])
        if machine_tag_set & tech_skills:
            return tech

    return candidates[0]


def _is_on_shift(tech: Technician, now_hour: int) -> bool:
    s, e = tech.shift_start_hour, tech.shift_end_hour
    if s <= e:
        return s <= now_hour < e
    # Overnight shift e.g. 22-06
    return now_hour >= s or now_hour < e


# ── Auto-assign technician ──────────────────────────────────────────────────

async def _auto_assign(
    db: AsyncSession,
    pred: FailurePrediction,
    machine_tags: list,
) -> Optional[Technician]:
    if pred.assigned_technician_id:
        return None  # already assigned

    tech = await _find_available_technician(db, machine_tags)
    if not tech:
        logger.warning("No technician available for %s", pred.machine_id)
        return None

    now = datetime.utcnow()
    # Mark technician as busy
    tech.is_available = False
    tech.current_assignment_machine_id = pred.machine_id
    tech.current_assignment_machine_name = pred.machine_name
    tech.assignment_started_at = now
    tech.estimated_free_at = now + timedelta(hours=2)  # default 2-hour job

    # Update prediction record
    pred.assigned_technician_id = tech.id
    pred.assigned_technician_name = tech.name
    pred.assigned_at = now

    await db.flush()
    logger.info("Auto-assigned %s to machine %s", tech.name, pred.machine_id)
    return tech


# ── Auto-create maintenance work order ─────────────────────────────────────

async def _auto_create_work_order(
    db: AsyncSession, pred: FailurePrediction, machine_name: str
) -> Optional[str]:
    if pred.auto_work_order_id:
        return pred.auto_work_order_id  # already created

    scheduled_for = (
        datetime.utcnow() + timedelta(hours=max(1.0, pred.estimated_hours_remaining * 0.8))
    )
    wo = MaintenanceRecord(
        machine_id=pred.machine_id,
        machine_name=machine_name,
        type="predictive",
        status="scheduled",
        title=f"[AUTO] {pred.failure_type} — {pred.urgency.upper()} risk",
        description=(
            f"Automatically generated work order.\n"
            f"Predicted failure in {pred.estimated_hours_remaining:.1f}h "
            f"(confidence {pred.confidence * 100:.0f}%).\n"
            f"Recommendation: {pred.recommendation}"
        ),
        scheduled_date=scheduled_for.strftime("%Y-%m-%d"),
        assigned_to=pred.assigned_technician_name,
        estimated_duration=120,
    )
    db.add(wo)
    await db.flush()

    pred.auto_work_order_id = wo.id
    logger.info("Auto work-order %s created for %s", wo.id, pred.machine_id)
    return wo.id


# ── Create DB alert for milestone ──────────────────────────────────────────

async def _create_milestone_alert(
    db: AsyncSession,
    pred: FailurePrediction,
    hours_remaining: float,
) -> None:
    h = pred.estimated_hours_remaining
    if h <= 1:
        label = f"{int(h * 60)} minutes"
    elif h <= 24:
        label = f"{h:.0f} hours"
    else:
        label = f"{h / 24:.1f} days"

    severity = "critical" if h <= 24 else "error" if h <= 72 else "warning"
    alert = Alert(
        machine_id=pred.machine_id,
        machine_name=pred.machine_name,
        severity=severity,
        status="active",
        title=f"⚠️ Predicted failure in {label}: {pred.machine_name}",
        message=(
            f"{pred.failure_type} detected. Machine expected to fail in approximately {label}. "
            f"Assigned technician: {pred.assigned_technician_name or 'Pending assignment'}. "
            f"Recommendation: {pred.recommendation}"
        ),
        sensor_id=None,
        value=pred.estimated_hours_remaining,
    )
    db.add(alert)


# ── Core automation cycle ───────────────────────────────────────────────────

async def _run_cycle() -> None:
    async with AsyncSessionLocal() as db:
        # Load all at-risk machines
        result = await db.execute(
            select(Machine).where(Machine.risk_score >= RISK_THRESHOLD_FOR_PREDICTION)
        )
        machines = result.scalars().all()

        now = datetime.utcnow()

        for machine in machines:
            try:
                await _process_machine(db, machine, now)
            except Exception as exc:
                logger.error("Error processing %s: %s", machine.id, exc, exc_info=True)

        await db.commit()


async def _process_machine(db: AsyncSession, machine: Machine, now: datetime) -> None:
    # ── Compute fresh prediction ──
    pred_data = compute_prediction(
        machine_id=machine.id,
        machine_name=machine.name,
        risk_score=machine.risk_score,
        tags=machine.tags or [],
        install_date_str=machine.install_date,
        last_maintenance_date_str=machine.next_maintenance_date,
    )

    hours_remaining = pred_data["estimated_hours_remaining"]
    predicted_at = datetime.fromisoformat(pred_data["predicted_failure_at"])

    # ── Upsert prediction record ──
    existing = await db.execute(
        select(FailurePrediction).where(
            FailurePrediction.machine_id == machine.id,
            FailurePrediction.is_active == True,
        )
    )
    pred: Optional[FailurePrediction] = existing.scalar_one_or_none()

    if pred is None:
        pred = FailurePrediction(
            machine_id=machine.id,
            machine_name=machine.name,
        )
        db.add(pred)

    pred.predicted_failure_at = predicted_at
    pred.estimated_hours_remaining = hours_remaining
    pred.confidence = pred_data["confidence"]
    pred.failure_type = pred_data["failure_type"]
    pred.urgency = pred_data["urgency"]
    pred.recommendation = pred_data["recommendation"]
    pred.updated_at = now

    await db.flush()

    # ── Auto-assign technician for high/critical/imminent ──
    tech = None
    if pred.urgency in ("high", "critical", "imminent") and not pred.assigned_technician_id:
        tech = await _auto_assign(db, pred, machine.tags or [])
        if tech:
            await _auto_create_work_order(db, pred, machine.name)

            tech_payload = {
                "machineId": machine.id,
                "machineName": machine.name,
                "technicianId": tech.id,
                "technicianName": tech.name,
                "technicianEmail": tech.email,
                "technicianPhone": tech.phone,
                "specialty": tech.specialty,
                "estimatedFreeAt": tech.estimated_free_at.isoformat() if tech.estimated_free_at else None,
                "workOrderId": pred.auto_work_order_id,
                "timestamp": now.isoformat(),
            }

            # Broadcast technician assigned
            await ws_manager.broadcast_all({
                "type": "technician_assigned",
                "payload": tech_payload,
            })

            # Send email/Slack notification
            await notify_technician_assigned(tech_payload)

    # ── Check notification milestones ──
    for milestone_hours, flag_field in NOTIFICATION_MILESTONES:
        if hours_remaining <= milestone_hours and not getattr(pred, flag_field):
            setattr(pred, flag_field, True)
            await _create_milestone_alert(db, pred, hours_remaining)

            msg_payload = {
                "machineId": machine.id,
                "machineName": machine.name,
                "estimatedHoursRemaining": hours_remaining,
                "predictedFailureAt": pred.predicted_failure_at.isoformat(),
                "failureType": pred.failure_type,
                "urgency": pred.urgency,
                "confidence": pred.confidence,
                "recommendation": pred.recommendation,
                "assignedTechnician": pred.assigned_technician_name,
                "workOrderId": pred.auto_work_order_id,
                "milestoneHours": milestone_hours,
                "timestamp": now.isoformat(),
            }

            # Broadcast pre-failure alert to all WebSocket subscribers
            await ws_manager.broadcast_all({
                "type": "pre_failure_alert",
                "payload": msg_payload,
            })

            # Send email/Slack notification
            await notify_pre_failure_alert(msg_payload)

            logger.info(
                "PRE-FAILURE ALERT sent: %s — %.1fh remaining (milestone %dh)",
                machine.name, hours_remaining, milestone_hours
            )

    # ── Always broadcast current prediction state (lightweight) ──
    await ws_manager.broadcast_all({
        "type": "failure_prediction",
        "payload": {
            "machineId": machine.id,
            "machineName": machine.name,
            "estimatedHoursRemaining": hours_remaining,
            "predictedFailureAt": pred.predicted_failure_at.isoformat(),
            "urgency": pred.urgency,
            "confidence": pred.confidence,
            "failureType": pred.failure_type,
            "assignedTechnician": pred.assigned_technician_name,
            "workOrderId": pred.auto_work_order_id,
            "timestamp": now.isoformat(),
        },
    })


# ── Entry point called from main.py lifespan ───────────────────────────────

async def run_automation_loop() -> None:
    """Infinite loop — run as asyncio task."""
    logger.info("Automation loop started (interval=%ds)", POLL_INTERVAL_SECONDS)
    while True:
        try:
            await _run_cycle()
        except Exception as exc:
            logger.error("Automation cycle error: %s", exc, exc_info=True)
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
