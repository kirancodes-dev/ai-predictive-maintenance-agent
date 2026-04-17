import pandas as pd

from predictive_maintenance.data_loader import load_historical_data


def test_load_historical_data_combines_csv_and_parquet(tmp_path):
    csv_path = tmp_path / "a.csv"
    parquet_path = tmp_path / "b.parquet"

    pd.DataFrame(
        [
            {"asset_id": "asset-1", "vibration": 0.4, "temperature": 40.0, "current": 5.0, "failure_next_24h": 0},
        ]
    ).to_csv(csv_path, index=False)

    pd.DataFrame(
        [
            {"asset_id": "asset-2", "vibration": 1.4, "temperature": 80.0, "current": 15.0, "failure_next_24h": 1},
        ]
    ).to_parquet(parquet_path, index=False)

    frame = load_historical_data(tmp_path)

    assert len(frame) == 2
    assert set(["a.csv", "b.parquet"]).issubset(set(frame["source_file"]))
