from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.dependencies import get_current_user
from app.services import insights_service as svc

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/overview")
async def get_overview(_: User = Depends(get_current_user)):
    """Phase + ROI summary for all 4 machines — lightweight, one call."""
    results = await svc.overview_all_machines()
    return {"data": results, "success": True}


@router.get("/{machine_id}/analysis")
async def get_analysis(machine_id: str, _: User = Depends(get_current_user)):
    """Full analysis for a single machine: phase, correlation, ROI, windows, report."""
    if machine_id not in svc.MACHINE_PROFILES:
        raise HTTPException(status_code=404, detail=f"Unknown machine: {machine_id}")
    result = await svc.full_analysis(machine_id)
    return {"data": result, "success": True}


@router.get("/{machine_id}/phase")
async def get_phase(machine_id: str, _: User = Depends(get_current_user)):
    """Failure phase only — fast endpoint for polling."""
    if machine_id not in svc.MACHINE_PROFILES:
        raise HTTPException(status_code=404, detail=f"Unknown machine: {machine_id}")
    from app.services.insights_service import fetch_recent_history, detect_failure_phase
    history = await fetch_recent_history(machine_id, hours=3)
    return {"data": detect_failure_phase(machine_id, history), "success": True}
