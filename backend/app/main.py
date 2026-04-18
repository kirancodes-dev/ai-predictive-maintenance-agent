import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.utils.seed_data import seed_database
from app.routers import auth, machines, alerts, maintenance, stream, websocket, predictions, technicians, ml, data, insights, fingerprints
from app.services.automation import run_automation_loop
from app.services.ml_service import ml_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

_automation_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _automation_task
    # Startup
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed_database(db)

    # Bootstrap ML model (load existing or train from data/)
    try:
        ml_service.bootstrap()
    except Exception as e:
        logger.warning(f"⚠️ ML bootstrap skipped: {e}")

    # Start background automation loop
    _automation_task = asyncio.create_task(run_automation_loop())
    logger.info("🤖 Automation loop started")

    yield

    # Shutdown
    if _automation_task and not _automation_task.done():
        _automation_task.cancel()
        try:
            await _automation_task
        except asyncio.CancelledError:
            pass
    logger.info("🛑 Automation loop stopped")


app = FastAPI(
    title="Predictive Maintenance API",
    version="2.0.0",
    description=(
        "## AI-Powered Predictive Maintenance Platform\n\n"
        "Real-time machine health monitoring with automated failure prediction, "
        "technician dispatch, and maintenance scheduling.\n\n"
        "### Key Capabilities\n"
        "- **ML Ensemble**: Isolation Forest, One-Class SVM, Random Forest, XGBoost\n"
        "- **Real-time Streaming**: WebSocket sensor data with anomaly detection\n"
        "- **Automation Loop**: Auto-predictions every 30s, milestone alerts, technician dispatch\n"
        "- **Work Order Management**: Auto-generated maintenance orders from predictions\n\n"
        "### Authentication\n"
        "All endpoints (except `/health` and `/docs`) require a Bearer token.\n"
        "Obtain one via `POST /api/v1/auth/login`.\n\n"
        "Default credentials: `admin@factory.com` / `Admin@123`"
    ),
    openapi_tags=[
        {"name": "auth", "description": "Authentication — login, token, user profile"},
        {"name": "machines", "description": "Machine CRUD — register, update, list factory machines"},
        {"name": "alerts", "description": "Alert management — view, acknowledge, resolve alerts"},
        {"name": "predictions", "description": "Failure predictions — AI-generated risk forecasts"},
        {"name": "maintenance", "description": "Work orders — schedule, assign, complete maintenance jobs"},
        {"name": "technicians", "description": "Technician management — availability, skills, shifts"},
        {"name": "ml", "description": "ML model — train, predict, check model status"},
        {"name": "data", "description": "Data ingestion — upload CSV/Parquet training data"},
        {"name": "stream", "description": "Sensor data — current readings and historical data from simulator"},
        {"name": "fingerprints", "description": "Failure fingerprints — known failure patterns for comparison"},
        {"name": "websocket", "description": "Real-time WebSocket — live sensor streaming and alerts"},
    ],
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

_cors_origins = settings.cors_origins_list
_wildcard = "*" in _cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=not _wildcard,  # can't combine allow_origins=* with credentials=True
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST routes ─────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1")
app.include_router(machines.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(maintenance.router, prefix="/api/v1")
app.include_router(stream.router, prefix="/api/v1")
app.include_router(predictions.router, prefix="/api/v1")
app.include_router(technicians.router, prefix="/api/v1")
app.include_router(ml.router, prefix="/api/v1")
app.include_router(data.router, prefix="/api/v1")
app.include_router(insights.router, prefix="/api/v1")
app.include_router(fingerprints.router, prefix="/api/v1")

# ── WebSocket ────────────────────────────────────────────────────────────────
app.include_router(websocket.router)


@app.get("/", tags=["health"])
async def root():
    return {
        "service": "Predictive Maintenance API",
        "version": "2.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "api_prefix": "/api/v1",
        "endpoints": {
            "auth": "/api/v1/auth",
            "machines": "/api/v1/machines",
            "alerts": "/api/v1/alerts",
            "predictions": "/api/v1/predictions",
            "maintenance": "/api/v1/maintenance",
            "technicians": "/api/v1/technicians",
            "ml": "/api/v1/ml",
            "data": "/api/v1/data",
            "stream": "/api/v1/stream",
            "websocket": "/ws/sensors/{machine_id}",
        },
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "version": "2.0.0", "automation": "running"}
