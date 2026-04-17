from __future__ import annotations

from pathlib import Path

import pandas as pd


REQUIRED_COLUMNS = {"asset_id", "vibration", "temperature", "current", "failure_next_24h"}


def load_historical_data(data_dir: str | Path) -> pd.DataFrame:
    """Load CSV and Parquet files from a data directory and combine them."""
    path = Path(data_dir)
    files = sorted(list(path.glob("*.csv")) + list(path.glob("*.parquet")))
    if not files:
        raise FileNotFoundError(f"No CSV or Parquet files found in {path}")

    frames = []
    for file in files:
        if file.suffix == ".csv":
            frame = pd.read_csv(file)
        else:
            frame = pd.read_parquet(file)
        frame["source_file"] = file.name
        frames.append(frame)

    combined = pd.concat(frames, ignore_index=True)
    missing = REQUIRED_COLUMNS.difference(combined.columns)
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")

    return combined
