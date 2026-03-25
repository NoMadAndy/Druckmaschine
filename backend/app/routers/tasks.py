import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session
from app.middleware.auth import get_current_user
from app.models.project import Project
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.services.task_runner import task_runner
from app.utils.websocket_manager import manager

router = APIRouter(prefix="/tasks", tags=["tasks"])

_cancel_events: dict[int, asyncio.Event] = {}


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Task:
    result = await db.execute(
        select(Project).where(Project.id == body.project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owned by you")

    task = Task(
        project_id=body.project_id,
        title=body.title,
        description=body.description,
        status=TaskStatus.pending,
        progress=0,
        logs="",
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)

    cancel_event = asyncio.Event()
    _cancel_events[task.id] = cancel_event
    background_tasks.add_task(_run_task_background, task.id, cancel_event)
    return task


async def _run_task_background(task_id: int, cancel_event: asyncio.Event) -> None:
    async with async_session() as db:
        try:
            result = await db.execute(select(Task).where(Task.id == task_id))
            task = result.scalar_one_or_none()
            if not task:
                return
            await task_runner.run(task, db, manager, cancel_event)
            await db.commit()
        except Exception as exc:
            await db.rollback()
            async with async_session() as err_db:
                res = await err_db.execute(select(Task).where(Task.id == task_id))
                t = res.scalar_one_or_none()
                if t:
                    t.status = TaskStatus.failed
                    t.logs = (t.logs or "") + f"\nFatal error: {exc}"
                    await err_db.commit()
        finally:
            _cancel_events.pop(task_id, None)


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    project_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Task]:
    query = (
        select(Task)
        .join(Project)
        .where(Project.owner_id == current_user.id)
    )
    if project_id is not None:
        query = query.where(Task.project_id == project_id)
    query = query.offset(skip).limit(limit).order_by(Task.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Task:
    result = await db.execute(
        select(Task).join(Project).where(Task.id == task_id, Project.owner_id == current_user.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/{task_id}/cancel", response_model=TaskResponse)
async def cancel_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Task:
    result = await db.execute(
        select(Task).join(Project).where(Task.id == task_id, Project.owner_id == current_user.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status in (TaskStatus.completed, TaskStatus.failed, TaskStatus.cancelled):
        raise HTTPException(status_code=400, detail="Task already finished")

    cancel_event = _cancel_events.get(task_id)
    if cancel_event:
        cancel_event.set()

    task.status = TaskStatus.cancelled
    task.logs = (task.logs or "") + "\nTask cancelled by user."
    await db.flush()
    await db.refresh(task)
    await manager.broadcast_task_progress(task.id, "cancelled", task.progress, "Cancelled by user")
    return task
