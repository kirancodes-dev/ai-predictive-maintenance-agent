from __future__ import annotations

from pathlib import Path

import pandas as pd

from predictive_maintenance.data_loader import load_historical_data
from predictive_maintenance.drift import compute_drift_score
from predictive_maintenance.logging_utils import append_jsonl
from predictive_maintenance.model import FEATURE_COLUMNS, FailurePredictor


class MaintenanceService:
    def __init__(self, data_dir: str | Path = "data", model_dir: str | Path = "models", logs_dir: str | Path = "logs") -> None:
        self.data_dir = Path(data_dir)
        self.model_path = Path(model_dir) / "xgboost_failure_model.joblib"
        self.prediction_log_path = Path(logs_dir) / "predictions.jsonl"
        self.drift_log_path = Path(logs_dir) / "drift_metrics.jsonl"
        self.predictor = FailurePredictor()
        self.feature_stats: dict[str, dict[str, float]] = {}

    def bootstrap(self) -> None:
        data = load_historical_data(self.data_dir)
        artifacts = self.predictor.train(data, self.model_path)
        self.feature_stats = artifacts.feature_stats

    def predict(self, asset_id: str, features: dict[str, float]) -> dict[str, float | str]:
        rows = pd.DataFrame([{key: features[key] for key in FEATURE_COLUMNS}])
        probability = self.predictor.predict_failure_probability(rows)[0]
        drift_score = compute_drift_score(features, self.feature_stats)
        rul_hours = max(0.0, (1.0 - probability) * 240.0)

        prediction_record = {
            "asset_id": asset_id,
            "failure_probability": probability,
            "estimated_rul_hours": rul_hours,
            **features,
        }
        append_jsonl(self.prediction_log_path, prediction_record)
        append_jsonl(self.drift_log_path, {"asset_id": asset_id, "drift_score": drift_score, **features})

        return {
            "asset_id": asset_id,
            "failure_probability": probability,
            "estimated_rul_hours": rul_hours,
            "drift_score": drift_score,
        }
