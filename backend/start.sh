#!/usr/bin/env bash
# Run from the Hack2.0 root OR from the backend directory
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHONPATH="$BACKEND_DIR" "$BACKEND_DIR/venv/bin/uvicorn" app.main:app \
  --host 0.0.0.0 --port 8000 --reload \
  --reload-dir "$BACKEND_DIR"
