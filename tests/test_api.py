from fastapi.testclient import TestClient

from predictive_maintenance.api import app


def test_health_endpoint_reports_ready():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "ok"
        assert payload["model_ready"] is True


def test_predict_returns_probability_and_rul():
    with TestClient(app) as client:
        response = client.post(
            "/predict",
            json={
                "asset_id": "asset-009",
                "vibration": 1.8,
                "temperature": 90.0,
                "current": 14.8,
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert 0.0 <= payload["failure_probability"] <= 1.0
        assert payload["estimated_rul_hours"] >= 0.0
        assert 0.0 <= payload["drift_score"] <= 1.0
