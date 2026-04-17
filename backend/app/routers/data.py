"""
Data ingestion router — upload CSV/Parquet files for training data.
"""

import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.models.user import User
from app.dependencies import get_current_user
from app.services.ml_service import ml_service, DATA_DIR

router = APIRouter(prefix="/data", tags=["data"])

ALLOWED_EXTENSIONS = {".csv", ".parquet"}


@router.post("/upload")
async def upload_data_file(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    """Upload a CSV or Parquet file to the data directory for ML training."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only {', '.join(ALLOWED_EXTENSIONS)} files are supported",
        )

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    dest = DATA_DIR / file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {
        "data": {
            "filename": file.filename,
            "path": str(dest),
            "message": "File uploaded. Call POST /api/v1/ml/train to retrain the model.",
        }
    }


@router.get("/files")
async def list_data_files(_: User = Depends(get_current_user)):
    """List all data files available for training."""
    if not DATA_DIR.exists():
        return {"data": []}

    files = []
    for f in sorted(DATA_DIR.iterdir()):
        if f.suffix.lower() in ALLOWED_EXTENSIONS:
            files.append({
                "name": f.name,
                "size_bytes": f.stat().st_size,
                "extension": f.suffix,
            })
    return {"data": files}
