from datetime import datetime
from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    project_id: int
    title: str = Field(..., min_length=1, max_length=300)
    description: str = ""


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    progress: int | None = None


class TaskResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: str | None
    status: str
    result: dict | None
    progress: int
    created_at: datetime
    updated_at: datetime
    logs: str | None

    model_config = {"from_attributes": True}
