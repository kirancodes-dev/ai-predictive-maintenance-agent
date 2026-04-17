from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel, Field

from predictive_maintenance.service import MaintenanceService


app = FastAPI(title="AI Predictive Maintenance Agent")
service = MaintenanceService()


class PredictRequest(BaseModel):
    asset_id: str = Field(..., min_length=1)
    vibration: float
    temperature: float
    current: float


@app.on_event("startup")
def startup() -> None:
    service.bootstrap()


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {"status": "ok", "model_ready": bool(service.feature_stats)}


@app.post("/predict")
def predict(request: PredictRequest) -> dict[str, float | str]:
    return service.predict(
        asset_id=request.asset_id,
        features={
            "vibration": request.vibration,
            "temperature": request.temperature,
            "current": request.current,
        },
    )


@app.get("/alerts")
def alerts(threshold: float = 0.7) -> dict[str, list[dict]]:
    log_path = Path("logs/predictions.jsonl")
    if not log_path.exists():
        return {"alerts": []}

    flagged = []
    with log_path.open("r", encoding="utf-8") as file:
        for line in file:
            row = json.loads(line)
            if row.get("failure_probability", 0.0) >= threshold:
                flagged.append(row)
    return {"alerts": flagged[-50:]}
