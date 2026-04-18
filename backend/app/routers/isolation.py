"""
Isolation router — cascade failure prevention & machine isolation API.

Provides:
  - Machine topology (which machines are upstream/downstream)
  - Manual isolate / release endpoints
  - Isolation history & current status
  - Cascade impact analysis
"""

from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.isolation import MachineIsolation
from app.models.machine import Machine
from app.models.alert import Alert
from app.models.user import User
from app.dependencies import get_current_user, require_operator
from app.core.websocket_manager import ws_manager

router = APIRouter(prefix="/isolation", tags=["isolation"])

# ── Machine topology — 36-machine factory floor, 4 production lines ──────────
#
#  Layout: 4 lines × 9 machines each, arranged in a 6-column × 6-row grid
#
#  Line 1  (row 0-1): M01 → M02 → M03 → M04 → M05 → M06 → M07 → M08 → M09
#  Line 2  (row 2-3): M10 → M11 → M12 → M13 → M14 → M15 → M16 → M17 → M18
#  Line 3  (row 4-5): M19 → M20 → M21 → M22 → M23 → M24 → M25 → M26 →
#                     [M27 ⚠️ FAULT POINT] → M28 → M29 → M30 ← (BLOCKED)
#  Line 4  (row 6-7): M31 → M32 → M33 → M34 → M35 → M36
#
#  When M27 is isolated, downstream machines M28-M30 are automatically protected.
#
#  The 4 core demo machines retain their IDs for backward compatibility:
#    CNC_01, CNC_02, PUMP_03, CONVEYOR_04 are M01, M10, M19, M31 in the new map
#    but also kept as aliases in the status API for existing frontend pages.

def _make_line(
    line_num: int,
    start_m: int,
    count: int,
    zone: str,
    machine_type: str,
    row_offset: int,
) -> dict:
    """Generate a sequential chain of machines for one production line."""
    nodes = {}
    for i in range(count):
        m_num = start_m + i
        m_id = f"M{m_num:02d}"
        col = i % 6
        row = row_offset + (i // 6)
        upstream = [f"M{m_num - 1:02d}"] if i > 0 else []
        downstream = [f"M{m_num + 1:02d}"] if i < count - 1 else []
        nodes[m_id] = {
            "name": f"{machine_type} {m_num:02d}",
            "zone": zone,
            "position": (row, col),
            "downstream": downstream,
            "upstream": upstream,
            "line": f"Line-{line_num}",
            "machineType": machine_type,
        }
    return nodes


MACHINE_TOPOLOGY: dict = {}

# Line 1 — CNC Mills (M01-M09) — Zone A
MACHINE_TOPOLOGY.update(_make_line(1, 1, 9, "Zone A", "CNC Mill", 0))

# Line 2 — Industrial Pumps (M10-M18) — Zone B
MACHINE_TOPOLOGY.update(_make_line(2, 10, 9, "Zone B", "Pump", 2))

# Line 3 — Conveyor + Assembly (M19-M30) — Zone C
# Machines 1-9 of line 3 = M19-M27, machines 10-12 = M28-M30
MACHINE_TOPOLOGY.update(_make_line(3, 19, 12, "Zone C", "Conveyor", 4))

# Line 4 — Compressors (M31-M36) — Zone D
MACHINE_TOPOLOGY.update(_make_line(4, 31, 6, "Zone D", "Compressor", 6))

# ── Backward-compat aliases ─────────────────────────────────────────────────
# The original 4-machine IDs are kept as aliases in the status view so that
# existing alert/prediction pages continue to work.  They map to the first
# machine on each line.
_LEGACY_ALIAS = {
    "CNC_01":      "M01",
    "CNC_02":      "M10",
    "PUMP_03":     "M19",
    "CONVEYOR_04": "M31",
}

# Risk threshold above which auto-isolation is triggered
AUTO_ISOLATE_RISK_THRESHOLD = 85.0


# ── Schemas ──────────────────────────────────────────────────────────────────

class IsolateRequest(BaseModel):
    machine_id: str = Field(..., alias="machineId")
    reason: str = Field("Manual isolation by operator", max_length=500)

    class Config:
        populate_by_name = True


class ReleaseRequest(BaseModel):
    machine_id: str = Field(..., alias="machineId")

    class Config:
        populate_by_name = True


def _isolation_to_dict(iso: MachineIsolation) -> dict:
    return {
        "id": iso.id,
        "machineId": iso.machine_id,
        "machineName": iso.machine_name,
        "isIsolated": iso.is_isolated,
        "isolationType": iso.isolation_type,
        "reason": iso.reason,
        "riskScoreAtIsolation": iso.risk_score_at_isolation,
        "protectedMachineIds": iso.protected_machine_ids.split(",") if iso.protected_machine_ids else [],
        "protectedMachineNames": iso.protected_machine_names.split(",") if iso.protected_machine_names else [],
        "triggeredBy": iso.triggered_by,
        "isolatedAt": iso.isolated_at.isoformat() if iso.isolated_at else None,
        "releasedAt": iso.released_at.isoformat() if iso.released_at else None,
        "releasedBy": iso.released_by,
    }


# ── Topology endpoint ───────────────────────────────────────────────────────

@router.get("/topology")
async def get_topology(_: User = Depends(get_current_user)):
    """Return the machine topology / dependency graph for the factory floor."""
    return {"data": MACHINE_TOPOLOGY}


# ── Current isolation status ────────────────────────────────────────────────

@router.get("/status")
async def isolation_status(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get current isolation status for all machines."""
    result = await db.execute(
        select(MachineIsolation).where(MachineIsolation.is_isolated == True)
    )
    active = result.scalars().all()

    # Build status map
    status_map = {}
    for mid in MACHINE_TOPOLOGY:
        iso = next((a for a in active if a.machine_id == mid), None)
        topo = MACHINE_TOPOLOGY[mid]
        status_map[mid] = {
            "machineId": mid,
            "machineName": topo["name"],
            "zone": topo["zone"],
            "position": topo["position"],
            "line": topo["line"],
            "downstream": topo["downstream"],
            "upstream": topo["upstream"],
            "isIsolated": iso is not None,
            "isolation": _isolation_to_dict(iso) if iso else None,
        }

    return {"data": status_map}


# ── Cascade impact analysis ─────────────────────────────────────────────────

@router.get("/cascade-impact/{machine_id}")
async def cascade_impact(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Analyze what would happen if a machine fails — which downstream machines are at risk."""
    if machine_id not in MACHINE_TOPOLOGY:
        raise HTTPException(status_code=404, detail=f"Unknown machine: {machine_id}")

    topo = MACHINE_TOPOLOGY[machine_id]
    affected = []

    # BFS through downstream dependencies
    visited = set()
    queue = list(topo["downstream"])
    while queue:
        mid = queue.pop(0)
        if mid in visited:
            continue
        visited.add(mid)
        downstream_topo = MACHINE_TOPOLOGY.get(mid, {})

        # Get current risk score for downstream machine
        machine_result = await db.execute(select(Machine).where(Machine.id == mid))
        m = machine_result.scalar_one_or_none()

        affected.append({
            "machineId": mid,
            "machineName": downstream_topo.get("name", mid),
            "zone": downstream_topo.get("zone", "unknown"),
            "currentRiskScore": m.risk_score if m else 0,
            "currentStatus": m.status if m else "unknown",
            "impactLevel": "direct" if mid in topo["downstream"] else "indirect",
        })

        # Add further downstream
        for further in downstream_topo.get("downstream", []):
            if further not in visited:
                queue.append(further)

    return {
        "data": {
            "sourceId": machine_id,
            "sourceName": topo["name"],
            "affectedMachines": affected,
            "totalAtRisk": len(affected),
            "recommendation": (
                f"Isolating {topo['name']} will protect {len(affected)} downstream machine(s) "
                f"from potential cascade failure."
            ) if affected else "No downstream machines at risk.",
        }
    }


# ── Manual isolate ──────────────────────────────────────────────────────────

@router.post("/isolate", dependencies=[Depends(require_operator)])
async def isolate_machine(
    req: IsolateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Manually isolate a machine to prevent cascade failures."""
    machine_id = req.machine_id

    if machine_id not in MACHINE_TOPOLOGY:
        raise HTTPException(status_code=404, detail=f"Unknown machine: {machine_id}")

    # Check if already isolated
    existing = await db.execute(
        select(MachineIsolation).where(
            MachineIsolation.machine_id == machine_id,
            MachineIsolation.is_isolated == True,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Machine {machine_id} is already isolated")

    topo = MACHINE_TOPOLOGY[machine_id]

    # Get machine risk score
    machine_result = await db.execute(select(Machine).where(Machine.id == machine_id))
    machine = machine_result.scalar_one_or_none()
    risk_score = machine.risk_score if machine else 0

    # Identify downstream machines that will be protected
    downstream_ids = _get_all_downstream(machine_id)
    downstream_names = [MACHINE_TOPOLOGY[d]["name"] for d in downstream_ids if d in MACHINE_TOPOLOGY]

    # Update machine status to "isolated"
    if machine:
        machine.status = "isolated"

    # Create isolation record
    iso = MachineIsolation(
        machine_id=machine_id,
        machine_name=topo["name"],
        is_isolated=True,
        isolation_type="manual",
        reason=req.reason,
        risk_score_at_isolation=risk_score,
        protected_machine_ids=",".join(downstream_ids) if downstream_ids else None,
        protected_machine_names=",".join(downstream_names) if downstream_names else None,
        triggered_by=f"{user.name} ({user.role})",
    )
    db.add(iso)

    # Create alert for the isolation event
    alert = Alert(
        machine_id=machine_id,
        machine_name=topo["name"],
        severity="warning",
        status="active",
        title=f"🔒 Machine Isolated: {topo['name']}",
        message=(
            f"Machine manually isolated by {user.name}. "
            f"Reason: {req.reason}. "
            f"Protected downstream: {', '.join(downstream_names) if downstream_names else 'none'}."
        ),
    )
    db.add(alert)

    await db.commit()

    # Broadcast via WebSocket
    payload = {
        "type": "machine_isolated",
        "payload": {
            "machineId": machine_id,
            "machineName": topo["name"],
            "isolationType": "manual",
            "reason": req.reason,
            "triggeredBy": user.name,
            "protectedMachines": downstream_ids,
            "protectedMachineNames": downstream_names,
            "riskScore": risk_score,
            "timestamp": datetime.utcnow().isoformat(),
        },
    }
    await ws_manager.broadcast_all(payload)

    return {
        "data": _isolation_to_dict(iso),
        "message": f"Machine {topo['name']} isolated. {len(downstream_ids)} downstream machine(s) protected.",
    }


# ── Release isolation ───────────────────────────────────────────────────────

@router.post("/release", dependencies=[Depends(require_operator)])
async def release_machine(
    req: ReleaseRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Release a machine from isolation after the issue is resolved."""
    machine_id = req.machine_id

    result = await db.execute(
        select(MachineIsolation).where(
            MachineIsolation.machine_id == machine_id,
            MachineIsolation.is_isolated == True,
        )
    )
    iso = result.scalar_one_or_none()
    if not iso:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} is not currently isolated")

    # Release
    iso.is_isolated = False
    iso.released_at = datetime.utcnow()
    iso.released_by = f"{user.name} ({user.role})"

    # Restore machine status
    machine_result = await db.execute(select(Machine).where(Machine.id == machine_id))
    machine = machine_result.scalar_one_or_none()
    if machine:
        if machine.risk_score >= 70:
            machine.status = "critical"
        elif machine.risk_score >= 40:
            machine.status = "warning"
        else:
            machine.status = "online"

    await db.commit()

    # Broadcast
    await ws_manager.broadcast_all({
        "type": "machine_released",
        "payload": {
            "machineId": machine_id,
            "machineName": iso.machine_name,
            "releasedBy": user.name,
            "timestamp": datetime.utcnow().isoformat(),
        },
    })

    return {
        "data": _isolation_to_dict(iso),
        "message": f"Machine {iso.machine_name} released from isolation.",
    }


# ── Isolation history ───────────────────────────────────────────────────────

@router.get("/history")
async def isolation_history(
    machine_id: Optional[str] = Query(None, alias="machineId"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get isolation history (all or per-machine)."""
    q = select(MachineIsolation).order_by(MachineIsolation.created_at.desc())
    if machine_id:
        q = q.where(MachineIsolation.machine_id == machine_id)
    q = q.limit(limit)

    result = await db.execute(q)
    records = result.scalars().all()
    return {"data": [_isolation_to_dict(r) for r in records]}


# ── Helper: get all downstream machines (BFS) ───────────────────────────────

def _get_all_downstream(machine_id: str) -> List[str]:
    """BFS through topology to find all downstream machines."""
    visited = set()
    queue = list(MACHINE_TOPOLOGY.get(machine_id, {}).get("downstream", []))
    result = []
    while queue:
        mid = queue.pop(0)
        if mid in visited:
            continue
        visited.add(mid)
        result.append(mid)
        for further in MACHINE_TOPOLOGY.get(mid, {}).get("downstream", []):
            if further not in visited:
                queue.append(further)
    return result


def get_all_downstream(machine_id: str) -> List[str]:
    """Public version for use by automation loop."""
    return _get_all_downstream(machine_id)
