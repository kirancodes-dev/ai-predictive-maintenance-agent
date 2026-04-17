from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.utils.seed_data import seed_database
from app.routers import auth, machines, alerts, maintenance, stream, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed_database(db)
    yield
    # Shutdown (nothing to clean up for SQLite)


app = FastAPI(
    title="Predictive Maintenance API",
    version="1.0.0",
    description="Backend API for the Predictive Maintenance Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routes under /api/v1
app.include_router(auth.router, prefix="/api/v1")
app.include_router(machines.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(maintenance.router, prefix="/api/v1")
app.include_router(stream.router, prefix="/api/v1")

# WebSocket routes at root level
app.include_router(websocket.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
