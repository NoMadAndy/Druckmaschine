import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.utils.websocket_manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, channel: str = "general") -> None:
    await manager.connect(websocket, channel)
    try:
        await manager.broadcast_system_event(
            "client_connected",
            {"connections": manager.connection_count, "channel": channel},
        )
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = {"message": raw}

            msg_type = data.get("type", "message")

            if msg_type == "subscribe":
                new_channel = data.get("channel", "general")
                await manager.disconnect(websocket, channel)
                await manager.connect(websocket, new_channel)
                await manager.send_personal(websocket, {
                    "type": "subscribed",
                    "channel": new_channel,
                })

            elif msg_type == "ping":
                await manager.send_personal(websocket, {"type": "pong"})

            elif msg_type == "broadcast":
                await manager.broadcast(
                    {"type": "user_message", "data": data.get("data", {})},
                    channel=channel,
                )

            else:
                await manager.send_personal(websocket, {
                    "type": "echo",
                    "data": data,
                })

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await manager.disconnect(websocket, channel)
        await manager.broadcast_system_event(
            "client_disconnected",
            {"connections": manager.connection_count},
        )
