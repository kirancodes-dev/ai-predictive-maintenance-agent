#!/usr/bin/env bash
set -e

echo "================================================"
echo "  Predictive Maintenance Backend Setup"
echo "================================================"

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backend"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "❌ backend/ directory not found. Run this from the Hack2.0 root."
  exit 1
fi

cd "$BACKEND_DIR"

# 1. Python check
if ! command -v python3 &>/dev/null; then
  echo "❌ python3 not found. Please install Python 3.10+."
  exit 1
fi

PY_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "✅ Python $PY_VERSION found"

# 2. Virtual environment
if [ ! -d "venv" ]; then
  echo "📦 Creating virtual environment..."
  python3 -m venv venv
fi
echo "✅ Virtual environment ready"

# 3. Activate and install
source venv/bin/activate
echo "📦 Installing dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
echo "✅ Dependencies installed"

# 4. Copy .env if not exists
if [ ! -f ".env" ]; then
  cp .env .env.local 2>/dev/null || true
fi

echo ""
echo "================================================"
echo "  Setup complete!"
echo ""
echo "  To start the backend:"
echo "    cd backend"
echo "    source venv/bin/activate"
echo "    uvicorn app.main:app --reload --port 8000"
echo ""
echo "  API docs:  http://localhost:8000/docs"
echo "  Health:    http://localhost:8000/health"
echo ""
echo "  Default login credentials:"
echo "    admin@predictive.io    / admin123"
echo "    operator@predictive.io / operator123"
echo "    engineer@predictive.io / engineer123"
echo "================================================"
