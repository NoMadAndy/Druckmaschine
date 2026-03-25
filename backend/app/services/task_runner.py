import asyncio
import traceback
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskStatus
from app.services.ai_service import ai_service
from app.utils.websocket_manager import WebSocketManager


class BackgroundTaskRunner:
    async def run(
        self,
        task: Task,
        db: AsyncSession,
        ws_manager: WebSocketManager,
        cancel_event: asyncio.Event,
    ) -> None:
        await self._update_task(task, db, ws_manager, TaskStatus.planning, 5, "Starting task analysis...")

        if cancel_event.is_set():
            return

        plan = await self._plan(task)
        await self._append_log(task, f"Plan created with {len(plan)} subtasks")
        await self._update_task(task, db, ws_manager, TaskStatus.planning, 15, "Plan created")

        if cancel_event.is_set():
            return

        await self._update_task(task, db, ws_manager, TaskStatus.researching, 25, "Researching...")
        research = await self._research(task)
        await self._append_log(task, f"Research complete: {len(research.get('result', ''))} chars")
        await self._update_task(task, db, ws_manager, TaskStatus.researching, 40, "Research done")

        if cancel_event.is_set():
            return

        await self._update_task(task, db, ws_manager, TaskStatus.executing, 50, "Executing subtasks...")

        total_subtasks = len(plan)
        for i, subtask in enumerate(plan):
            if cancel_event.is_set():
                await self._append_log(task, "Task cancelled during execution")
                return

            progress = 50 + int((i + 1) / max(total_subtasks, 1) * 45)
            await self._append_log(task, f"Executing subtask {i + 1}/{total_subtasks}: {subtask['title']}")
            result = await self._execute_subtask(subtask)
            await self._append_log(task, f"  -> Subtask result: {str(result)[:200]}")
            await self._update_task(
                task, db, ws_manager, TaskStatus.executing, progress,
                f"Subtask {i + 1}/{total_subtasks} done",
            )

        task.result = {
            "plan": plan,
            "research_summary": str(research.get("result", ""))[:500],
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "subtasks_completed": total_subtasks,
        }
        await self._update_task(task, db, ws_manager, TaskStatus.completed, 100, "Task completed")

    async def _plan(self, task: Task) -> list[dict]:
        try:
            result = await ai_service.plan_task(
                f"{task.title}: {task.description}",
                {"task_id": task.id, "project_id": task.project_id},
            )
            data = result.get("result", {})
            if isinstance(data, dict) and "subtasks" in data:
                return data["subtasks"]
            return [
                {"title": "Analyze requirements", "description": task.description or task.title, "estimated_minutes": 10},
                {"title": "Implement solution", "description": "Build based on requirements", "estimated_minutes": 20},
                {"title": "Validate results", "description": "Test and verify", "estimated_minutes": 10},
            ]
        except Exception as exc:
            return [
                {"title": "Manual execution", "description": f"Fallback due to: {exc}", "estimated_minutes": 30},
            ]

    async def _research(self, task: Task) -> dict[str, Any]:
        try:
            return await ai_service.research_topic(
                f"{task.title}: {task.description}",
                {"task_id": task.id},
            )
        except Exception:
            return {"result": "Research unavailable in offline mode"}

    async def _execute_subtask(self, subtask: dict) -> dict:
        await asyncio.sleep(0.5)
        try:
            result = await ai_service.generate_code(
                subtask.get("description", subtask.get("title", "")),
                {"subtask": subtask.get("title", "")},
            )
            return {"status": "completed", "output": str(result.get("result", ""))[:300]}
        except Exception as exc:
            return {"status": "completed_with_fallback", "output": str(exc)}

    async def _update_task(
        self,
        task: Task,
        db: AsyncSession,
        ws_manager: WebSocketManager,
        status: TaskStatus,
        progress: int,
        message: str,
    ) -> None:
        task.status = status
        task.progress = progress
        await db.flush()
        await ws_manager.broadcast_task_progress(task.id, status.value, progress, message)

    async def _append_log(self, task: Task, message: str) -> None:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        task.logs = (task.logs or "") + f"\n[{timestamp}] {message}"


task_runner = BackgroundTaskRunner()
