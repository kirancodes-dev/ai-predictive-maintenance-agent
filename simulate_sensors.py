from __future__ import annotations

import random
import time

import requests


API_URL = "http://localhost:8000/predict"
ASSET_IDS = ["asset-001", "asset-002", "asset-003"]


def main() -> None:
    print("Starting simulated sensor stream. Press Ctrl+C to stop.")
    while True:
        asset_id = random.choice(ASSET_IDS)
        payload = {
            "asset_id": asset_id,
            "vibration": round(random.uniform(0.1, 2.5), 3),
            "temperature": round(random.uniform(30.0, 105.0), 2),
            "current": round(random.uniform(4.0, 20.0), 2),
        }
        response = requests.post(API_URL, json=payload, timeout=5)
        print(f"{asset_id} -> {response.status_code}: {response.json()}")
        time.sleep(2)


if __name__ == "__main__":
    main()
