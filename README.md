# ai-predictive-maintenance-agent

Predictive maintenance service that:
- Loads historical sensor data from `data/` (CSV and Parquet)
- Trains an XGBoost model to predict failure probability in the next 24 hours
- Exposes FastAPI endpoints: `/predict`, `/health`, and `/alerts`
- Includes `simulate_sensors.py` for simulated real-time sensor streaming
- Logs predictions and model drift metrics to `logs/`
- Provides a Streamlit dashboard (`dashboard.py`) for asset health and RUL
- Includes `Dockerfile` and `docker-compose.yml` for deployment
- Uses Poetry dependency management (`pyproject.toml`)

## Quick start

```bash
poetry install
poetry run uvicorn predictive_maintenance.api:app --reload
```

API: `http://localhost:8000`

Dashboard:

```bash
poetry run streamlit run dashboard.py
```

Sensor simulation:

```bash
poetry run python simulate_sensors.py
```
