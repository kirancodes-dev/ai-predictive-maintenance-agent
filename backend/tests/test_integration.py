"""
Integration tests for the FastAPI backend.
Tests auth, machines, alerts, predictions, ML, and data endpoints.
"""

import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db, AsyncSessionLocal, engine, Base
from app.utils.seed_data import seed_database


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_db():
    """Initialize DB and seed data before all tests."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed_database(db)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def auth_headers(client: AsyncClient):
    """Login and return auth headers."""
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@factory.com",
        "password": "Admin@123",
    })
    assert resp.status_code == 200
    token = resp.json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


# ── Health ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    resp = await client.get("/")
    assert resp.status_code == 200
    assert "Predictive Maintenance" in resp.json()["service"]


# ── Auth ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@factory.com",
        "password": "Admin@123",
    })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "accessToken" in data
    assert data["user"]["email"] == "admin@factory.com"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@factory.com",
        "password": "wrong",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_no_token(client: AsyncClient):
    resp = await client.get("/api/v1/machines")
    assert resp.status_code in (401, 403)


# ── Machines ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_machines(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/machines", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "items" in data
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_get_machine_by_id(client: AsyncClient, auth_headers: dict):
    # First get list to find an ID
    resp = await client.get("/api/v1/machines", headers=auth_headers)
    machine_id = resp.json()["data"]["items"][0]["id"]

    resp2 = await client.get(f"/api/v1/machines/{machine_id}", headers=auth_headers)
    assert resp2.status_code == 200
    assert resp2.json()["data"]["id"] == machine_id


@pytest.mark.asyncio
async def test_get_machine_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/machines/nonexistent", headers=auth_headers)
    assert resp.status_code == 404


# ── Alerts ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_alerts(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/alerts", headers=auth_headers)
    assert resp.status_code == 200


# ── Predictions ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_live_predictions(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/predictions/live", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert isinstance(data, list)
    if data:
        pred = data[0]
        assert "estimated_hours_remaining" in pred
        assert "confidence" in pred
        assert "failure_type" in pred


@pytest.mark.asyncio
async def test_predictions_list(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/predictions", headers=auth_headers)
    assert resp.status_code == 200


# ── Stream ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_stream_live(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/machines", headers=auth_headers)
    machine_id = resp.json()["data"]["items"][0]["id"]

    resp2 = await client.get(f"/api/v1/stream/{machine_id}/live", headers=auth_headers)
    assert resp2.status_code == 200
    data = resp2.json()["data"]
    assert isinstance(data, list)


# ── ML ───────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ml_status(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/ml/status", headers=auth_headers)
    assert resp.status_code == 200
    assert "model_ready" in resp.json()["data"]


@pytest.mark.asyncio
async def test_ml_train(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/v1/ml/train", headers=auth_headers)
    # May succeed or fail depending on data availability
    assert resp.status_code in (200, 400)


@pytest.mark.asyncio
async def test_ml_predict_without_model(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/v1/ml/predict", headers=auth_headers, json={
        "asset_id": "test-001",
        "vibration": 1.5,
        "temperature": 85.0,
        "current": 12.0,
    })
    # 200 if model is ready, 503 if not
    assert resp.status_code in (200, 503)


# ── Data ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_data_files(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/data/files", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"], list)


# ── Maintenance ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_maintenance(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/maintenance", headers=auth_headers)
    assert resp.status_code == 200


# ── Technicians ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_technicians(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/technicians", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert isinstance(data, list)
    assert len(data) >= 1
