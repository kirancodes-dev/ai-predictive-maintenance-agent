from __future__ import annotations

import requests
import pandas as pd
import streamlit as st

API_BASE = "http://localhost:8000/api/v1"

st.set_page_config(page_title="Asset Health Dashboard", layout="wide")
st.title("Predictive Maintenance Dashboard")

# ── Auth ─────────────────────────────────────────────────────────────────────
if "token" not in st.session_state:
    st.session_state.token = None

if not st.session_state.token:
    with st.form("login"):
        email = st.text_input("Email", value="admin@factory.com")
        password = st.text_input("Password", type="password", value="Admin@123")
        if st.form_submit_button("Login"):
            resp = requests.post(f"{API_BASE}/auth/login", json={"email": email, "password": password})
            if resp.ok:
                data = resp.json().get("data", {})
                st.session_state.token = data.get("accessToken")
                st.rerun()
            else:
                st.error("Login failed")
    st.stop()

headers = {"Authorization": f"Bearer {st.session_state.token}"}


# ── Helper ───────────────────────────────────────────────────────────────────
def api_get(path: str):
    resp = requests.get(f"{API_BASE}{path}", headers=headers, timeout=10)
    if resp.status_code == 401:
        st.session_state.token = None
        st.rerun()
    return resp.json().get("data") if resp.ok else None


# ── Machines ─────────────────────────────────────────────────────────────────
machines_data = api_get("/machines")
items = machines_data.get("items", []) if isinstance(machines_data, dict) else []

if not items:
    st.info("No machines found.")
    st.stop()

st.subheader("🏭 Machines Overview")
machines_df = pd.DataFrame(items)[["name", "status", "riskScore", "riskLevel", "location", "model"]]
st.dataframe(machines_df, use_container_width=True)

# ── Predictions ──────────────────────────────────────────────────────────────
preds = api_get("/predictions/live")
if preds:
    st.subheader("🔮 Live Failure Predictions")
    pred_df = pd.DataFrame(preds)[["machine_name", "estimated_hours_remaining", "confidence", "failure_type", "urgency"]]
    pred_df.columns = ["Machine", "Hours to Failure", "Confidence", "Failure Type", "Urgency"]

    left, right = st.columns(2)
    with left:
        st.dataframe(pred_df, use_container_width=True)
    with right:
        st.bar_chart(pred_df.set_index("Machine")["Confidence"], use_container_width=True)

# ── Alerts ───────────────────────────────────────────────────────────────────
alerts = api_get("/alerts")
alert_items = alerts if isinstance(alerts, list) else (alerts.get("items", []) if isinstance(alerts, dict) else [])
if alert_items:
    st.subheader("🚨 Active Alerts")
    alert_df = pd.DataFrame(alert_items)[["machineName", "severity", "title", "status"]]
    st.dataframe(alert_df, use_container_width=True)

# ── ML Model Status ─────────────────────────────────────────────────────────
ml_status = api_get("/ml/status")
if ml_status:
    st.subheader("🤖 ML Model Status")
    st.json(ml_status)

# ── Logout ───────────────────────────────────────────────────────────────────
if st.button("Logout"):
    st.session_state.token = None
    st.rerun()
