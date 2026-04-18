#!/bin/bash
# stop.sh — Kill all local Predictive Maintenance services

PID_FILE="/tmp/predictive_maint_pids"

if [ -f "$PID_FILE" ]; then
  read -r PIDS < "$PID_FILE"
  echo "🛑 Stopping PIDs: $PIDS"
  # shellcheck disable=SC2086
  kill -9 $PIDS 2>/dev/null || true
  rm -f "$PID_FILE"
fi

# Belt-and-suspenders: kill by port
echo "🔄 Clearing ports 3000, 8000, 5173…"
lsof -ti:3000,8000,5173 2>/dev/null | xargs kill -9 2>/dev/null || true

echo "✅ All services stopped."
