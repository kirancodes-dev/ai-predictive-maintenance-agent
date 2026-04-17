import asyncio
import json
from typing import Dict, Set
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, machine_id: str):
        await websocket.accept()
        self.connections.setdefault(machine_id, set()).add(websocket)

    def disconnect(self, websocket: WebSocket, machine_id: str):
        if machine_id in self.connections:
            self.connections[machine_id].discard(websocket)
            if not self.connections[machine_id]:
                del self.connections[machine_id]

    async def broadcast_to_machine(self, machine_id: str, message: dict):
        if machine_id not in self.connections:
            return
        dead = set()
        for ws in self.connections[machine_id]:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.connections[machine_id].discard(ws)

    async def broadcast_all(self, message: dict):
        for machine_id in list(self.connections.keys()):
            await self.broadcast_to_machine(machine_id, message)

    @property
    def active_machines(self) -> list:
        return list(self.connections.keys())


ws_manager = WebSocketManager()
