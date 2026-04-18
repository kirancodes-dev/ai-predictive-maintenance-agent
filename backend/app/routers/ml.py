"""
ML router — model training, prediction, and status endpoints.
"""

import io
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user, require_admin, require_manager
from app.services.ml_service import ml_service, DATA_DIR

router = APIRouter(prefix="/ml", tags=["ml"])


class PredictRequest(BaseModel):
    asset_id: str
    vibration: float
    temperature: float
    current: float


class TrainResponse(BaseModel):
    success: bool
    message: str
    samples_trained: Optional[int] = None


@router.get("/status")
async def ml_status(_: User = Depends(get_current_user)):
    """Return ML model status and feature statistics."""
    return {"data": ml_service.get_status()}


@router.post("/train", dependencies=[Depends(require_admin)])
async def train_model(_: User = Depends(get_current_user)):
    """Train/retrain the ML model from data in the data/ directory."""
    success = ml_service.train_from_directory(str(DATA_DIR))
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Training failed — check data directory has CSV/Parquet files with required columns",
        )
    return {
        "data": {
            "success": True,
            "message": "Model trained successfully",
            "status": ml_service.get_status(),
        }
    }


@router.post("/train/upload", dependencies=[Depends(require_admin)])
async def train_from_upload(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    """Upload a CSV file and train the model from it."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    import pandas as pd

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {exc}")

    success = ml_service.train(df)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Training failed — ensure CSV has columns: vibration, temperature, current, failure_next_24h",
        )

    return {
        "data": {
            "success": True,
            "message": f"Model trained from uploaded file ({len(df)} rows)",
            "status": ml_service.get_status(),
        }
    }


@router.post("/predict")
async def predict(
    req: PredictRequest,
    _: User = Depends(get_current_user),
):
    """Predict failure probability for given sensor readings."""
    result = ml_service.predict_failure_probability(
        vibration=req.vibration,
        temperature=req.temperature,
        current=req.current,
    )
    if not result["model_ready"]:
        raise HTTPException(
            status_code=503,
            detail="ML model not ready. Train the model first via POST /api/v1/ml/train",
        )

    return {
        "data": {
            "asset_id": req.asset_id,
            **result,
        }
    }
