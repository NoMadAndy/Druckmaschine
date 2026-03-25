import asyncio
import json
from datetime import datetime
from typing import Any

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}
        self._all_connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, channel: str = "general") -> None:
        await websocket.accept()
        async with self._lock:
            if channel not in self._connections:
                self._connections[channel] = []
            self._connections[channel].append(websocket)
            self._all_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket, channel: str = "general") -> None:
        async with self._lock:
            if channel in self._connections:
                if websocket in self._connections[channel]:
                    self._connections[channel].remove(websocket)
            if websocket in self._all_connections:
                self._all_connections.remove(websocket)

    async def send_personal(self, websocket: WebSocket, data: dict[str, Any]) -> None:
        try:
            await websocket.send_json(data)
        except Exception:
            await self.disconnect(websocket)

    async def broadcast(self, data: dict[str, Any], channel: str | None = None) -> None:
        message = {
            **data,
            "timestamp": datetime.utcnow().isoformat(),
        }
        targets = (
            list(self._connections.get(channel, []))
            if channel
            else list(self._all_connections)
        )
        disconnected: list[tuple[WebSocket, str | None]] = []
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append((ws, channel))
        for ws, ch in disconnected:
            await self.disconnect(ws, ch or "general")

    async def broadcast_task_progress(
        self, task_id: int, status: str, progress: int, message: str = ""
    ) -> None:
        await self.broadcast(
            {
                "type": "task_progress",
                "task_id": task_id,
                "status": status,
                "progress": progress,
                "message": message,
            },
            channel="tasks",
        )

    async def broadcast_log(self, level: str, message: str, source: str = "app") -> None:
        await self.broadcast(
            {
                "type": "log",
                "level": level,
                "message": message,
                "source": source,
            },
            channel="logs",
        )

    async def broadcast_system_event(self, event: str, data: dict[str, Any] | None = None) -> None:
        await self.broadcast(
            {
                "type": "system_event",
                "event": event,
                "data": data or {},
            },
        )

    @property
    def connection_count(self) -> int:
        return len(self._all_connections)


manager = WebSocketManager()
