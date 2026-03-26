from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_admin
from app.models.changelog import ChangelogEntry
from app.models.user import User
from app.services.changelog_service import changelog_service

router = APIRouter(prefix="/changelog", tags=["changelog"])


class ChangelogCreate(BaseModel):
    version: str = Field(..., max_length=50)
    title: str = Field(..., max_length=300)
    description: str = ""
    changes: list[str] = []
    author: str = ""


class ChangelogResponse(BaseModel):
    id: int
    version: str
    title: str
    description: str | None
    changes: list | None
    created_at: str
    author: str | None

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[ChangelogResponse])
async def list_changelog(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
) -> list:
    result = await db.execute(
        select(ChangelogEntry).order_by(ChangelogEntry.created_at.desc()).offset(skip).limit(limit)
    )
    entries = result.scalars().all()
    out = []
    for e in entries:
        out.append(ChangelogResponse(
            id=e.id,
            version=e.version,
            title=e.title,
            description=e.description or "",
            changes=e.changes or [],
            created_at=e.created_at.isoformat() if e.created_at else "",
            author=e.author or "",
        ))
    return out


@router.post("/", response_model=ChangelogResponse, status_code=status.HTTP_201_CREATED)
async def create_changelog(
    body: ChangelogCreate,
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ChangelogResponse:
    entry = ChangelogEntry(
        version=body.version,
        title=body.title,
        description=body.description,
        changes=body.changes,
        author=body.author,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return ChangelogResponse(
        id=entry.id,
        version=entry.version,
        title=entry.title,
        description=entry.description or "",
        changes=entry.changes or [],
        created_at=entry.created_at.isoformat() if entry.created_at else "",
        author=entry.author or "",
    )


@router.post("/auto-detect", response_model=list[ChangelogResponse])
async def auto_detect_changelog(
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[ChangelogResponse]:
    entries = await changelog_service.detect_and_create(db)
    out = []
    for e in entries:
        out.append(ChangelogResponse(
            id=e.id,
            version=e.version,
            title=e.title,
            description=e.description or "",
            changes=e.changes or [],
            created_at=e.created_at.isoformat() if e.created_at else "",
            author=e.author or "",
        ))
    return out
