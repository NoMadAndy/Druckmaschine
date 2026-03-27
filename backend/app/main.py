import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import close_db, init_db
from app.services.log_service import log_service

settings = get_settings()


@asynccontextmanager
async def lifespan(application: FastAPI):
    logger = log_service.setup()
    logger.info("Starting Druckmaschine backend v%s", settings.VERSION)

    await init_db()
    logger.info("Database initialized")

    static_dir = Path(settings.STATIC_DIR)
    static_dir.mkdir(parents=True, exist_ok=True)

    log_dir = Path(settings.LOG_FILE).parent
    log_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Druckmaschine backend ready")
    yield

    logger.info("Shutting down Druckmaschine backend")
    await close_db()
    logger.info("Database connections closed")


app = FastAPI(
    title="Druckmaschine",
    description="AI-powered project management and automation platform",
    version=settings.VERSION,
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import auth, users, projects, tasks, logs, changelog, websocket, ai_agents, trading

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(logs.router)
app.include_router(changelog.router)
app.include_router(websocket.router)
app.include_router(ai_agents.router)
app.include_router(trading.router)

static_path = Path(settings.STATIC_DIR)
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")


@app.get("/")
async def root() -> dict:
    return {
        "name": "Druckmaschine",
        "version": settings.VERSION,
        "status": "running",
    }


@app.get("/health")
async def health() -> dict:
    return {"status": "healthy", "version": settings.VERSION}
