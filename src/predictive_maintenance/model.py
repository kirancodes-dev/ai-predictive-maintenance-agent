from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import joblib
import pandas as pd
from xgboost import XGBClassifier


FEATURE_COLUMNS = ["vibration", "temperature", "current"]


@dataclass
class TrainingArtifacts:
    model_path: Path
    feature_stats: dict[str, dict[str, float]]


class FailurePredictor:
    def __init__(self) -> None:
        self.model = XGBClassifier(
            n_estimators=50,
            max_depth=3,
            learning_rate=0.1,
            subsample=1.0,
            objective="binary:logistic",
            eval_metric="logloss",
        )

    def train(self, data: pd.DataFrame, model_path: str | Path) -> TrainingArtifacts:
        x = data[FEATURE_COLUMNS]
        y = data["failure_next_24h"].astype(int)
        self.model.fit(x, y)

        path = Path(model_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path)

        feature_stats = {
            column: {"mean": float(x[column].mean()), "std": float(x[column].std() or 1.0)}
            for column in FEATURE_COLUMNS
        }
        return TrainingArtifacts(model_path=path, feature_stats=feature_stats)

    def load(self, model_path: str | Path) -> None:
        self.model = joblib.load(model_path)

    def predict_failure_probability(self, rows: pd.DataFrame) -> list[float]:
        probabilities = self.model.predict_proba(rows[FEATURE_COLUMNS])[:, 1]
        return [float(prob) for prob in probabilities]
