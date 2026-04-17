"""
ML Service — integrates XGBoost-based failure prediction into the backend.

Responsibilities:
  - Train model from CSV/Parquet sensor data
  - Predict failure probability for given sensor readings
  - Compute feature drift scores
  - Persist model artifacts to disk
"""

import logging
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger("ml_service")

FEATURE_COLUMNS = ["vibration", "temperature", "current"]
MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models"
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
MODEL_PATH = MODEL_DIR / "xgboost_failure_model.joblib"
STATS_PATH = MODEL_DIR / "feature_stats.joblib"

MAX_RUL_HOURS = 240.0


class MLService:
    """Singleton-style ML service for training and inference."""

    def __init__(self) -> None:
        self.model = None
        self.feature_stats: dict = {}
        self.is_ready = False

    def bootstrap(self) -> bool:
        """Try to load an existing model, or train from available data."""
        if MODEL_PATH.exists() and STATS_PATH.exists():
            try:
                self.model = joblib.load(MODEL_PATH)
                self.feature_stats = joblib.load(STATS_PATH)
                self.is_ready = True
                logger.info("ML model loaded from %s", MODEL_PATH)
                return True
            except Exception as exc:
                logger.warning("Failed to load model: %s", exc)

        # Try training from data directory
        return self.train_from_directory(str(DATA_DIR))

    def train_from_directory(self, data_dir: str) -> bool:
        """Load all CSV/Parquet files from a directory and train."""
        path = Path(data_dir)
        files = sorted(list(path.glob("*.csv")) + list(path.glob("*.parquet")))
        if not files:
            logger.warning("No training data found in %s", path)
            return False

        frames = []
        for f in files:
            try:
                if f.suffix == ".csv":
                    df = pd.read_csv(f)
                else:
                    df = pd.read_parquet(f)
                frames.append(df)
            except Exception as exc:
                logger.warning("Skipping %s: %s", f.name, exc)

        if not frames:
            return False

        combined = pd.concat(frames, ignore_index=True)
        return self.train(combined)

    def train(self, data: pd.DataFrame) -> bool:
        """Train XGBoost model from a DataFrame."""
        required = set(FEATURE_COLUMNS + ["failure_next_24h"])
        missing = required - set(data.columns)
        if missing:
            logger.error("Missing columns for training: %s", missing)
            return False

        try:
            from xgboost import XGBClassifier
        except ImportError:
            logger.error("xgboost not installed — cannot train ML model")
            return False

        x = data[FEATURE_COLUMNS].copy()
        y = data["failure_next_24h"].astype(int)

        # Drop rows with NaN
        mask = x.notna().all(axis=1) & y.notna()
        x, y = x[mask], y[mask]

        if len(x) < 10:
            logger.warning("Not enough training samples: %d", len(x))
            return False

        model = XGBClassifier(
            n_estimators=50,
            max_depth=3,
            learning_rate=0.1,
            objective="binary:logistic",
            eval_metric="logloss",
            use_label_encoder=False,
        )
        model.fit(x, y)

        # Compute feature stats for drift detection
        feature_stats = {
            col: {"mean": float(x[col].mean()), "std": float(x[col].std() or 1.0)}
            for col in FEATURE_COLUMNS
        }

        # Persist
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, MODEL_PATH)
        joblib.dump(feature_stats, STATS_PATH)

        self.model = model
        self.feature_stats = feature_stats
        self.is_ready = True
        logger.info(
            "ML model trained on %d samples, saved to %s", len(x), MODEL_PATH
        )
        return True

    def predict_failure_probability(
        self, vibration: float, temperature: float, current: float
    ) -> dict:
        """Predict failure probability and RUL for given sensor readings."""
        if not self.is_ready or self.model is None:
            return {
                "failure_probability": None,
                "estimated_rul_hours": None,
                "drift_score": None,
                "model_ready": False,
            }

        row = pd.DataFrame(
            [{"vibration": vibration, "temperature": temperature, "current": current}]
        )
        prob = float(self.model.predict_proba(row[FEATURE_COLUMNS])[:, 1][0])
        rul = max(0.0, (1.0 - prob) * MAX_RUL_HOURS)
        drift = self._compute_drift(
            {"vibration": vibration, "temperature": temperature, "current": current}
        )

        return {
            "failure_probability": round(prob, 4),
            "estimated_rul_hours": round(rul, 1),
            "drift_score": round(drift, 4),
            "model_ready": True,
        }

    def _compute_drift(self, features: dict) -> float:
        """Compute how far current readings are from training distribution."""
        if not self.feature_stats:
            return 0.0
        z_scores = []
        for col in FEATURE_COLUMNS:
            stats = self.feature_stats.get(col)
            if stats and stats["std"] > 0:
                z = abs(features.get(col, 0) - stats["mean"]) / stats["std"]
                z_scores.append(z)
        if not z_scores:
            return 0.0
        # Normalize: average z-score, capped at 1.0
        return min(1.0, sum(z_scores) / len(z_scores) / 3.0)

    def get_status(self) -> dict:
        return {
            "model_ready": self.is_ready,
            "model_path": str(MODEL_PATH) if MODEL_PATH.exists() else None,
            "feature_columns": FEATURE_COLUMNS,
            "feature_stats": self.feature_stats,
            "data_dir": str(DATA_DIR),
        }


# Module-level singleton
ml_service = MLService()
