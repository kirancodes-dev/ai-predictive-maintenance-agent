from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import streamlit as st


st.set_page_config(page_title="Asset Health Dashboard", layout="wide")
st.title("Predictive Maintenance Dashboard")

log_path = Path("logs/predictions.jsonl")
if not log_path.exists():
    st.info("No predictions logged yet. Call the /predict API to populate data.")
    st.stop()

records = []
with log_path.open("r", encoding="utf-8") as file:
    for line in file:
        records.append(json.loads(line))

frame = pd.DataFrame(records)
if frame.empty:
    st.info("No predictions available yet.")
    st.stop()

latest = frame.sort_values("timestamp").groupby("asset_id").tail(1)
latest["asset_health"] = latest["failure_probability"].apply(lambda value: "At Risk" if value >= 0.7 else "Healthy")

left, right = st.columns(2)
with left:
    st.subheader("Latest Asset Health")
    st.dataframe(latest[["asset_id", "asset_health", "failure_probability", "estimated_rul_hours"]], use_container_width=True)

with right:
    st.subheader("Failure Probability Trend")
    st.line_chart(frame[["failure_probability"]], use_container_width=True)
