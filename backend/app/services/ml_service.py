"""
ML Service — multi-algorithm failure prediction ensemble.

Algorithms:
  - Isolation Forest (anomaly detection)
  - XGBoost / Gradient Boosting (primary classification — gradient boosted trees)
  - Random Forest (secondary classification — ensemble trees)

Note: Uses sklearn HistGradientBoostingClassifier as the XGBoost-equivalent
(same gradient boosted decision tree algorithm) when xgboost library is unavailable.

Responsibilities:
  - Train models from CSV/Parquet sensor data
  - Predict failure probability via weighted ensemble
  - Compute feature drift scores
  - Persist model artifacts to disk
"""

import logging
from pathlib import Path
from typing import Optional, Dict, Any, List

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger("ml_service")

FEATURE_COLUMNS = ["vibration", "temperature", "current"]
MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models"
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
ENSEMBLE_PATH = MODEL_DIR / "ensemble_models.joblib"
STATS_PATH = MODEL_DIR / "feature_stats.joblib"

MAX_RUL_HOURS = 240.0

# Ensemble weights per algorithm
ALGO_WEIGHTS = {
    "isolation_forest": 0.20,
    "xgboost": 0.50,
    "random_forest": 0.30,
}


class MLService:
    """Multi-algorithm ML service for training and inference."""

    def __init__(self) -> None:
        self.models: Dict[str, Any] = {}
        self.feature_stats: dict = {}
        self.scaler = None
        self.is_ready = False
        self.active_algorithms: List[str] = []

    def bootstrap(self) -> bool:
        """Try to load existing models, or train from available data."""
        if ENSEMBLE_PATH.exists() and STATS_PATH.exists():
            try:
                saved = joblib.load(ENSEMBLE_PATH)
                self.models = saved["models"]
                self.scaler = saved.get("scaler")
                self.active_algorithms = saved.get("active_algorithms", [])
                self.feature_stats = joblib.load(STATS_PATH)
                self.is_ready = True
                logger.info("Ensemble loaded: %s", self.active_algorithms)
                return True
            except Exception as exc:
                logger.warning("Failed to load models: %s", exc)

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
        """Train all available algorithms from a DataFrame."""
        required = set(FEATURE_COLUMNS + ["failure_next_24h"])
        missing = required - set(data.columns)
        if missing:
            logger.error("Missing columns for training: %s", missing)
            return False

        from sklearn.preprocessing import StandardScaler
        from sklearn.ensemble import IsolationForest, RandomForestClassifier, HistGradientBoostingClassifier

        # Try native XGBoost first; fall back to sklearn's equivalent algorithm
        try:
            from xgboost import XGBClassifier as _XGBClassifier
            _xgb_cls = _XGBClassifier
            _xgb_kwargs = dict(
                n_estimators=200, max_depth=4, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                objective="binary:logistic", eval_metric="logloss",
                use_label_encoder=False, random_state=42,
            )
            _xgb_label = "XGBoost (native)"
        except Exception:
            # HistGradientBoostingClassifier implements the same gradient boosted
            # decision tree algorithm — identical in approach to XGBoost
            _xgb_cls = HistGradientBoostingClassifier
            _xgb_kwargs = dict(
                max_iter=200, max_depth=4, learning_rate=0.05,
                min_samples_leaf=20, random_state=42,
            )
            _xgb_label = "XGBoost/GradientBoosting (sklearn)"

        x = data[FEATURE_COLUMNS].copy()
        y = data["failure_next_24h"].astype(int)

        mask = x.notna().all(axis=1) & y.notna()
        x, y = x[mask], y[mask]

        if len(x) < 10:
            logger.warning("Not enough training samples: %d", len(x))
            return False

        # Scale features
        scaler = StandardScaler()
        x_scaled = scaler.fit_transform(x)

        models: Dict[str, Any] = {}
        active: List[str] = []

        # 1. Isolation Forest — unsupervised anomaly detection
        try:
            iso = IsolationForest(
                n_estimators=100, contamination=0.1,
                random_state=42, n_jobs=-1,
            )
            iso.fit(x_scaled)
            models["isolation_forest"] = iso
            active.append("isolation_forest")
            logger.info("✅ Isolation Forest trained")
        except Exception as exc:
            logger.warning("Isolation Forest failed: %s", exc)

        # 2. XGBoost / Gradient Boosting — primary supervised classification
        try:
            xgb = _xgb_cls(**_xgb_kwargs)
            xgb.fit(x_scaled, y)
            models["xgboost"] = xgb
            active.append("xgboost")
            logger.info("✅ %s trained", _xgb_label)
        except Exception as exc:
            logger.warning("XGBoost/GradientBoosting failed: %s", exc)

        # 3. Random Forest — secondary supervised classification
        try:
            rf = RandomForestClassifier(
                n_estimators=100, max_depth=5,
                random_state=42, n_jobs=-1,
            )
            rf.fit(x_scaled, y)
            models["random_forest"] = rf
            active.append("random_forest")
            logger.info("✅ Random Forest trained")
        except Exception as exc:
            logger.warning("Random Forest failed: %s", exc)

        if not active:
            logger.error("No algorithms trained successfully")
            return False

        # Feature stats for drift detection
        feature_stats = {
            col: {"mean": float(x[col].mean()), "std": float(x[col].std() or 1.0)}
            for col in FEATURE_COLUMNS
        }

        # Persist
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump({"models": models, "scaler": scaler, "active_algorithms": active}, ENSEMBLE_PATH)
        joblib.dump(feature_stats, STATS_PATH)

        self.models = models
        self.scaler = scaler
        self.active_algorithms = active
        self.feature_stats = feature_stats
        self.is_ready = True
        logger.info("Ensemble trained: %s on %d samples", active, len(x))
        return True

    def predict_failure_probability(
        self, vibration: float, temperature: float, current: float
    ) -> dict:
        """Predict failure probability via weighted ensemble."""
        if not self.is_ready or not self.models:
            return {
                "failure_probability": None,
                "estimated_rul_hours": None,
                "drift_score": None,
                "model_ready": False,
                "algorithm_scores": {},
            }

        row = np.array([[vibration, temperature, current]])
        x_scaled = self.scaler.transform(row) if self.scaler else row

        scores: Dict[str, float] = {}
        weighted_sum = 0.0
        weight_total = 0.0

        # Isolation Forest: anomaly score → probability
        if "isolation_forest" in self.models:
            iso = self.models["isolation_forest"]
            raw = iso.decision_function(x_scaled)[0]
            # decision_function: negative = more anomalous
            prob_iso = max(0.0, min(1.0, 0.5 - raw * 0.5))
            scores["isolation_forest"] = round(prob_iso, 4)
            weighted_sum += prob_iso * ALGO_WEIGHTS["isolation_forest"]
            weight_total += ALGO_WEIGHTS["isolation_forest"]

        # XGBoost: primary classification probability
        if "xgboost" in self.models:
            xgb = self.models["xgboost"]
            prob_xgb = float(xgb.predict_proba(x_scaled)[:, 1][0])
            scores["xgboost"] = round(prob_xgb, 4)
            weighted_sum += prob_xgb * ALGO_WEIGHTS["xgboost"]
            weight_total += ALGO_WEIGHTS["xgboost"]

        # Random Forest: secondary classification probability
        if "random_forest" in self.models:
            rf = self.models["random_forest"]
            prob_rf = float(rf.predict_proba(x_scaled)[:, 1][0])
            scores["random_forest"] = round(prob_rf, 4)
            weighted_sum += prob_rf * ALGO_WEIGHTS["random_forest"]
            weight_total += ALGO_WEIGHTS["random_forest"]

        prob = weighted_sum / weight_total if weight_total > 0 else 0.0
        rul = max(0.0, (1.0 - prob) * MAX_RUL_HOURS)
        drift = self._compute_drift(
            {"vibration": vibration, "temperature": temperature, "current": current}
        )

        return {
            "failure_probability": round(prob, 4),
            "estimated_rul_hours": round(rul, 1),
            "drift_score": round(drift, 4),
            "model_ready": True,
            "algorithm_scores": scores,
            "active_algorithms": self.active_algorithms,
            "verified": self._two_step_verify(scores),
        }

    def _two_step_verify(self, scores: Dict[str, float], threshold: float = 0.5) -> bool:
        """
        Two-step verification: an alert is only considered 'verified' when
        at least 2 independent algorithms agree the failure probability
        exceeds the threshold. This multi-layer reduction prevents
        single-algorithm false positives from triggering real alerts.
        """
        if len(scores) < 2:
            # Only one model — can't cross-verify, trust it
            return any(s >= threshold for s in scores.values())

        agreeing = sum(1 for s in scores.values() if s >= threshold)
        verified = agreeing >= 2
        if not verified and any(s >= threshold for s in scores.values()):
            logger.info(
                "Two-step verification REJECTED — only %d/%d algorithms agree (scores=%s)",
                agreeing, len(scores), scores,
            )
        return verified

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
        return min(1.0, sum(z_scores) / len(z_scores) / 3.0)

    def get_status(self) -> dict:
        return {
            "model_ready": self.is_ready,
            "model_path": str(ENSEMBLE_PATH) if ENSEMBLE_PATH.exists() else None,
            "feature_columns": FEATURE_COLUMNS,
            "feature_stats": self.feature_stats,
            "data_dir": str(DATA_DIR),
            "active_algorithms": self.active_algorithms,
            "algorithm_weights": {k: v for k, v in ALGO_WEIGHTS.items() if k in self.active_algorithms},
        }


# Module-level singleton
ml_service = MLService()
