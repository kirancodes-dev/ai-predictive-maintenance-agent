#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh — Local dev launcher for Predictive Maintenance Platform
#
# Starts 3 services as background daemons (survive terminal close):
#   • Simulation server   → http://localhost:3000
#   • FastAPI backend     → http://localhost:8000
#   • Vite frontend       → http://localhost:5173
#
# Usage:
#   ./start.sh            start all services
#   ./stop.sh             stop all services
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

WORKSPACE="/Users/kiranbiradar/Desktop/Hack2.0"
BACKEND_VENV="$WORKSPACE/backend/venv/bin"
NODE="$(which node 2>/dev/null || echo /usr/local/bin/node)"
PID_FILE="/tmp/predictive_maint_pids"
LOG_DIR="/tmp"

# ── Kill anything already on our ports ──────────────────────────────────────
echo "🔄 Clearing ports 3000, 8000, 5173…"
lsof -ti:3000,8000,5173 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# ── Simulation server (Node.js, port 3000) ──────────────────────────────────
echo "▶  Starting simulation server on http://localhost:3000 …"
"$NODE" "$WORKSPACE/simulation-server/server.js" \
  > "$LOG_DIR/sim.log" 2>&1 &
SIM_PID=$!
disown $SIM_PID

# ── Backend (FastAPI, port 8000) ─────────────────────────────────────────────
echo "▶  Starting backend API on http://localhost:8000 …"
PYTHONPATH="$WORKSPACE/backend" \
  "$BACKEND_VENV/uvicorn" app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --reload-dir "$WORKSPACE/backend/app" \
  > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
disown $BACKEND_PID

# Wait for backend to be healthy before printing "ready"
echo -n "   Waiting for backend"
for i in $(seq 1 20); do
  if curl -s "http://localhost:8000/health" > /dev/null 2>&1; then
    echo " ✅"
    break
  fi
  echo -n "."
  sleep 1
done

# ── Frontend (Vite, port 5173) ───────────────────────────────────────────────
echo "▶  Starting frontend on http://localhost:5173 …"
"$NODE" "$WORKSPACE/predictive-maintenance-frontend/node_modules/.bin/vite" \
  --port 5173 \
  --root "$WORKSPACE/predictive-maintenance-frontend" \
  > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
disown $FRONTEND_PID

# Save PIDs so stop.sh can find them
echo "$SIM_PID $BACKEND_PID $FRONTEND_PID" > "$PID_FILE"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  🟢  All services started                   ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Simulation:  http://localhost:3000          ║"
echo "║  Backend API: http://localhost:8000          ║"
echo "║  Frontend:    http://localhost:5173          ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Logs:                                       ║"
echo "║    tail -f /tmp/sim.log                      ║"
echo "║    tail -f /tmp/backend.log                  ║"
echo "║    tail -f /tmp/frontend.log                 ║"
echo "║  Stop: ./stop.sh                             ║"
echo "╚══════════════════════════════════════════════╝"

