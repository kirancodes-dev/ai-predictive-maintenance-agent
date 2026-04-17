#!/bin/bash
set -e

WORKSPACE="/Users/kiranbiradar/Desktop/Hack2.0"
BACKEND_VENV="$WORKSPACE/backend/venv/bin"

# Kill anything on our ports
lsof -ti:8000,5173 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# Clean DB
rm -f "$WORKSPACE/backend/predictive_maintenance.db"

echo "==> Starting backend on http://localhost:8000 ..."
PYTHONPATH="$WORKSPACE/backend" \
  nohup "$BACKEND_VENV/uvicorn" app.main:app \
    --host 0.0.0.0 --port 8000 \
    > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "    Backend PID: $BACKEND_PID"

# Wait for backend to be ready
for i in $(seq 1 15); do
  if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo "    Backend is ready!"
    break
  fi
  sleep 1
done

echo "==> Starting frontend on http://localhost:5173 ..."
nohup /usr/local/bin/node \
  "$WORKSPACE/predictive-maintenance-frontend/node_modules/.bin/vite" \
  --port 5173 \
  --root "$WORKSPACE/predictive-maintenance-frontend" \
  > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "    Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Both services started."
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo "   Logs:     /tmp/backend.log  /tmp/frontend.log"
echo ""
echo "To stop: kill $BACKEND_PID $FRONTEND_PID"
