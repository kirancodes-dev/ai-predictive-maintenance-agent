import asyncio
import json
import random
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.sensor import Sensor
from app.models.machine import Machine
from app.core.websocket_manager import ws_manager
from app.core.security import decode_token
from app.config import settings

import httpx

router = APIRouter(tags=["websocket"])

# Sensor type → simulation server field name (same as stream.py)
SIM_FIELD_MAP = {
    "temperature": "temperature_C",
    "vibration": "vibration_mm_s",
    "rpm": "rpm",
    "current": "current_A",
}

_FALLBACK_RANGES = {
    "temperature": (60.0, 95.0),
    "vibration": (0.1, 5.5),
    "rpm": (900.0, 1800.0),
    "current": (5.0, 25.0),
}


def _build_sensor_messages(sim: dict, machine_id: str, sensors: list, machine) -> list[dict]:
    ts = sim.get("timestamp", datetime.utcnow().isoformat())
    messages = []
    for sensor in sensors:
        field = SIM_FIELD_MAP.get(sensor.type)
        if field and field in sim:
            value = float(sim[field])
        else:
            lo, hi = _FALLBACK_RANGES.get(sensor.type, (0.0, 100.0))
            value = round(random.uniform(lo, hi), 2)

        is_anomaly = value > sensor.critical_max or value < sensor.critical_min
        reading = {
            "sensorId": sensor.id,
            "machineId": machine_id,
            "type": sensor.type,
            "value": round(value, 2),
            "unit": sensor.unit,
            "timestamp": ts,
            "isAnomaly": is_anomaly,
        }
        messages.append({"type": "sensor_update", "payload": reading})

        if is_anomaly and machine:
            severity = "critical" if value > sensor.critical_max * 1.1 else "warning"
            messages.append({
                "type": "alert",
                "payload": {
                    "id": f"live-{sensor.id}-{int(datetime.utcnow().timestamp())}",
                    "machineId": machine_id,
                    "machineName": machine.name if machine else machine_id,
                    "severity": severity,
                    "status": "active",
                    "title": f"{sensor.type.capitalize()} anomaly detected",
                    "message": f"{sensor.name} reading {round(value, 2)} {sensor.unit} out of range",
                    "timestamp": ts,
                    "sensorId": sensor.id,
                    "value": round(value, 2),
                },
            })

    if machine:
        messages.append({
            "type": "machine_status",
            "payload": {"machineId": machine_id, "status": machine.status},
        })

    return messages


async def stream_sensor_data(websocket: WebSocket, machine_id: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Sensor).where(Sensor.machine_id == machine_id, Sensor.is_active == True)
        )
        sensors = result.scalars().all()
        machine_result = await db.execute(select(Machine).where(Machine.id == machine_id))
        machine = machine_result.scalar_one_or_none()

    if not sensors:
        await websocket.send_text(json.dumps({"type": "error", "payload": "No sensors found"}))
        return

    # Try to consume simulation server SSE stream
    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "GET",
                f"{settings.SIMULATION_SERVER_URL}/stream/{machine_id}",
            ) as response:
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    try:
                        sim = json.loads(line[6:])
                    except json.JSONDecodeError:
                        continue

                    for msg in _build_sensor_messages(sim, machine_id, sensors, machine):
                        await websocket.send_text(json.dumps(msg))

    except (WebSocketDisconnect, asyncio.CancelledError):
        raise
    except Exception:
        # Simulation server unavailable — fall back to random generation
        await _fallback_stream(websocket, machine_id, sensors, machine)


async def _fallback_stream(websocket: WebSocket, machine_id: str, sensors: list, machine):
    try:
        while True:
            for sensor in sensors:
                lo, hi = _FALLBACK_RANGES.get(sensor.type, (0.0, 100.0))
                value = round(random.uniform(lo, hi), 2)
                if random.random() < 0.04:
                    value = round(hi * random.uniform(1.05, 1.2), 2)
                is_anomaly = value > sensor.critical_max or value < sensor.critical_min
                reading = {
                    "sensorId": sensor.id,
                    "machineId": machine_id,
                    "type": sensor.type,
                    "value": value,
                    "unit": sensor.unit,
                    "timestamp": datetime.utcnow().isoformat(),
                    "isAnomaly": is_anomaly,
                }
                await websocket.send_text(json.dumps({"type": "sensor_update", "payload": reading}))

                if is_anomaly and machine:
                    await websocket.send_text(json.dumps({
                        "type": "alert",
                        "payload": {
                            "id": f"live-{sensor.id}-{int(datetime.utcnow().timestamp())}",
                            "machineId": machine_id,
                            "machineName": machine.name if machine else machine_id,
                            "severity": "critical" if value > hi * 1.2 else "warning",
                            "status": "active",
                            "title": f"{sensor.type.capitalize()} anomaly (fallback)",
                            "message": f"{sensor.name} reading {value} {sensor.unit} exceeds threshold",
                            "timestamp": datetime.utcnow().isoformat(),
                            "sensorId": sensor.id,
                            "value": value,
                        },
                    }))

            if machine:
                await websocket.send_text(json.dumps({
                    "type": "machine_status",
                    "payload": {"machineId": machine_id, "status": machine.status},
                }))
            await asyncio.sleep(3)
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass


@router.websocket("/ws/machines/{machine_id}")
async def websocket_machine(
    websocket: WebSocket,
    machine_id: str,
    token: str = Query(None),
):
    if token:
        payload = decode_token(token)
        if not payload.get("sub"):
            await websocket.close(code=4001)
            return

    await ws_manager.connect(websocket, machine_id)
    try:
        await stream_sensor_data(websocket, machine_id)
    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect(websocket, machine_id)


@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket, token: str = Query(None)):
    if token:
        payload = decode_token(token)
        if not payload.get("sub"):
            await websocket.close(code=4001)
            return
    await websocket.accept()
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({"type": "ping", "payload": None}))
    except WebSocketDisconnect:
        pass
