import asyncio
from pathlib import Path

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.config import get_settings
from app.services.log_service import log_service

router = APIRouter(prefix="/logs", tags=["logs"])
settings = get_settings()


@router.get("/app")
async def get_app_logs(
    lines: int = Query(200, ge=1, le=5000),
    level: str | None = None,
) -> dict:
    log_path = Path(settings.LOG_FILE)
    if not log_path.exists():
        return {"logs": [], "total": 0}
    text = log_path.read_text(errors="replace")
    all_lines = text.strip().splitlines()
    if level:
        level_upper = level.upper()
        all_lines = [ln for ln in all_lines if level_upper in ln]
    tail = all_lines[-lines:]
    return {"logs": tail, "total": len(tail)}


@router.get("/docker")
async def get_docker_logs(lines: int = Query(100, ge=1, le=2000)) -> dict:
    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "logs", "--tail", str(lines), "druckmaschine-backend",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        log_lines = stdout.decode(errors="replace").strip().splitlines()
        return {"logs": log_lines, "total": len(log_lines)}
    except FileNotFoundError:
        return {"logs": ["Docker not available"], "total": 0}
    except asyncio.TimeoutError:
        return {"logs": ["Timeout reading docker logs"], "total": 0}
    except Exception as exc:
        return {"logs": [f"Error: {exc}"], "total": 0}


@router.websocket("/stream")
async def stream_logs(websocket: WebSocket) -> None:
    await websocket.accept()
    queue: asyncio.Queue[str] = asyncio.Queue()
    log_service.add_subscriber(queue)
    try:
        while True:
            line = await queue.get()
            await websocket.send_text(line)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        log_service.remove_subscriber(queue)
