from __future__ import annotations


def compute_drift_score(feature_values: dict[str, float], baseline_stats: dict[str, dict[str, float]]) -> float:
    """Simple normalized drift score based on average z-score distance."""
    distances: list[float] = []
    for feature, value in feature_values.items():
        stats = baseline_stats.get(feature)
        if not stats:
            continue
        std = stats["std"] if stats["std"] > 0 else 1.0
        z_score = abs((value - stats["mean"]) / std)
        distances.append(min(z_score / 3.0, 1.0))

    if not distances:
        return 0.0
    return float(sum(distances) / len(distances))
