from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path


def append_jsonl(path: str | Path, payload: dict) -> None:
    log_path = Path(path)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as file:
        record = {"timestamp": datetime.now(UTC).isoformat(), **payload}
        file.write(json.dumps(record) + "\n")
