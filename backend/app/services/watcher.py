"""
File watcher service for Druckmaschine.

Monitors the /repo directory for file changes using polling (no inotify
dependency). On detected changes it:
  - Logs every change to stdout and to a rotating log file.
  - Publishes a rebuild notification on the Redis ``file_changes`` channel.
  - Creates a changelog entry in the PostgreSQL database.

Run as a standalone process:
    python -m app.services.watcher
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

import redis.asyncio as aioredis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_PATH = Path(os.getenv("WATCH_PATH", "/repo"))
POLL_INTERVAL = float(os.getenv("POLL_INTERVAL", "2.0"))  # seconds
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://druckmaschine:druckmaschine@db:5432/druckmaschine",
)
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
LOG_DIR = Path(os.getenv("LOG_DIR", "/app/logs"))
REDIS_CHANNEL = "file_changes"

# Directories and extensions to ignore while scanning.
IGNORE_DIRS = frozenset({
    ".git",
    "__pycache__",
    "node_modules",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "venv",
    ".idea",
    ".vscode",
    "dist",
    "build",
    ".next",
    ".eggs",
})

IGNORE_EXTENSIONS = frozenset({
    ".pyc",
    ".pyo",
    ".so",
    ".egg",
    ".whl",
    ".log",
    ".swp",
    ".swo",
})

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("watcher")


def _setup_file_logging() -> None:
    """Add a rotating file handler if the log directory is writable."""
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        from logging.handlers import RotatingFileHandler

        handler = RotatingFileHandler(
            LOG_DIR / "watcher.log",
            maxBytes=5 * 1024 * 1024,  # 5 MB
            backupCount=3,
            encoding="utf-8",
        )
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        )
        logger.addHandler(handler)
    except OSError:
        logger.warning("Could not create log directory %s; file logging disabled.", LOG_DIR)


# ---------------------------------------------------------------------------
# Snapshot helpers
# ---------------------------------------------------------------------------


def _should_ignore(path: Path) -> bool:
    """Return True if *path* should be skipped."""
    for part in path.parts:
        if part in IGNORE_DIRS:
            return True
    if path.suffix in IGNORE_EXTENSIONS:
        return True
    return False


def _file_hash(path: Path) -> Optional[str]:
    """Return a fast MD5 hex-digest of a file, or None on error."""
    try:
        h = hashlib.md5()
        with open(path, "rb") as fh:
            while chunk := fh.read(65536):
                h.update(chunk)
        return h.hexdigest()
    except OSError:
        return None


def _scan_directory(root: Path) -> Dict[str, str]:
    """
    Build a mapping ``{relative_path: md5_hash}`` for every tracked file
    under *root*.
    """
    snapshot: Dict[str, str] = {}
    if not root.is_dir():
        return snapshot
    for entry in root.rglob("*"):
        if not entry.is_file():
            continue
        if _should_ignore(entry):
            continue
        rel = str(entry.relative_to(root))
        digest = _file_hash(entry)
        if digest is not None:
            snapshot[rel] = digest
    return snapshot


# ---------------------------------------------------------------------------
# Change detection
# ---------------------------------------------------------------------------


def detect_changes(
    old: Dict[str, str], new: Dict[str, str]
) -> tuple[list[str], list[str], list[str]]:
    """
    Compare two snapshots and return ``(added, modified, deleted)`` lists
    of relative paths.
    """
    old_keys = set(old.keys())
    new_keys = set(new.keys())

    added = sorted(new_keys - old_keys)
    deleted = sorted(old_keys - new_keys)
    modified = sorted(
        k for k in old_keys & new_keys if old[k] != new[k]
    )
    return added, modified, deleted


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------


async def _create_db_engine():
    """Create an async SQLAlchemy engine with retry logic."""
    retries = 10
    for attempt in range(1, retries + 1):
        try:
            engine = create_async_engine(
                DATABASE_URL,
                echo=False,
                pool_size=2,
                max_overflow=0,
            )
            # Quick connectivity check.
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("Connected to database on attempt %d.", attempt)
            return engine
        except Exception as exc:
            logger.warning(
                "Database connection attempt %d/%d failed: %s", attempt, retries, exc
            )
            if attempt == retries:
                raise
            await asyncio.sleep(min(2 ** attempt, 30))
    # unreachable but keeps mypy happy
    raise RuntimeError("Could not connect to database")


async def _ensure_changelog_table(engine) -> None:
    """
    Make sure the ``changelog_entries`` table exists.  This is a simple
    CREATE IF NOT EXISTS so it is safe to run every time.
    """
    create_sql = text(
        """
        CREATE TABLE IF NOT EXISTS changelog_entries (
            id SERIAL PRIMARY KEY,
            version VARCHAR(32) NOT NULL DEFAULT '0.1.0',
            category VARCHAR(64) NOT NULL DEFAULT 'Geaendert',
            message TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )
    async with engine.begin() as conn:
        await conn.execute(create_sql)
    logger.info("changelog_entries table ensured.")


async def _insert_changelog_entry(
    session_factory, category: str, message: str
) -> None:
    """Insert a single changelog row."""
    async with session_factory() as session:
        async with session.begin():
            await session.execute(
                text(
                    "INSERT INTO changelog_entries (category, message) "
                    "VALUES (:category, :message)"
                ),
                {"category": category, "message": message},
            )


# ---------------------------------------------------------------------------
# Redis helpers
# ---------------------------------------------------------------------------


async def _get_redis() -> aioredis.Redis:
    """Connect to Redis with retry logic."""
    retries = 10
    for attempt in range(1, retries + 1):
        try:
            client = aioredis.from_url(REDIS_URL, decode_responses=True)
            await client.ping()
            logger.info("Connected to Redis on attempt %d.", attempt)
            return client
        except Exception as exc:
            logger.warning(
                "Redis connection attempt %d/%d failed: %s", attempt, retries, exc
            )
            if attempt == retries:
                raise
            await asyncio.sleep(min(2 ** attempt, 30))
    raise RuntimeError("Could not connect to Redis")


async def _publish_changes(
    redis_client: aioredis.Redis,
    added: list[str],
    modified: list[str],
    deleted: list[str],
) -> None:
    """Publish a rebuild notification to Redis pub/sub."""
    payload = json.dumps(
        {
            "event": "file_changes",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "added": added,
            "modified": modified,
            "deleted": deleted,
        }
    )
    await redis_client.publish(REDIS_CHANNEL, payload)
    logger.debug("Published change event to Redis channel '%s'.", REDIS_CHANNEL)


# ---------------------------------------------------------------------------
# Main watcher loop
# ---------------------------------------------------------------------------


async def watch_loop() -> None:
    """
    Core polling loop.  Takes an initial snapshot, then periodically
    re-scans and reports differences.
    """
    _setup_file_logging()

    logger.info("Starting file watcher on %s (poll every %.1fs).", REPO_PATH, POLL_INTERVAL)

    # Establish connections.
    engine = await _create_db_engine()
    await _ensure_changelog_table(engine)
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    redis_client = await _get_redis()

    # Initial snapshot.
    logger.info("Building initial file snapshot ...")
    snapshot = _scan_directory(REPO_PATH)
    logger.info("Initial snapshot contains %d files.", len(snapshot))

    while True:
        await asyncio.sleep(POLL_INTERVAL)

        new_snapshot = _scan_directory(REPO_PATH)
        added, modified, deleted = detect_changes(snapshot, new_snapshot)

        if not (added or modified or deleted):
            continue

        # Log every change.
        for path in added:
            logger.info("ADDED:    %s", path)
        for path in modified:
            logger.info("MODIFIED: %s", path)
        for path in deleted:
            logger.info("DELETED:  %s", path)

        # Publish to Redis.
        try:
            await _publish_changes(redis_client, added, modified, deleted)
        except Exception as exc:
            logger.error("Failed to publish to Redis: %s", exc)
            # Try to reconnect on next cycle.
            try:
                redis_client = await _get_redis()
            except Exception:
                pass

        # Write changelog entries.
        try:
            summary_parts: list[str] = []
            if added:
                summary_parts.append(f"{len(added)} Datei(en) hinzugefuegt")
            if modified:
                summary_parts.append(f"{len(modified)} Datei(en) geaendert")
            if deleted:
                summary_parts.append(f"{len(deleted)} Datei(en) geloescht")
            summary = "; ".join(summary_parts)

            # Determine category from the dominant change type.
            if added and not modified and not deleted:
                category = "Hinzugefuegt"
            elif deleted and not added:
                category = "Entfernt"
            else:
                category = "Geaendert"

            # Build detailed message.
            details_lines = [summary]
            all_paths = (
                [f"+ {p}" for p in added]
                + [f"~ {p}" for p in modified]
                + [f"- {p}" for p in deleted]
            )
            # Cap detail lines to avoid huge messages.
            if len(all_paths) <= 20:
                details_lines.extend(all_paths)
            else:
                details_lines.extend(all_paths[:20])
                details_lines.append(f"... und {len(all_paths) - 20} weitere Dateien")

            message = "\n".join(details_lines)
            await _insert_changelog_entry(session_factory, category, message)
            logger.info("Changelog entry created: %s", summary)
        except Exception as exc:
            logger.error("Failed to create changelog entry: %s", exc)

        # Update snapshot for next cycle.
        snapshot = new_snapshot


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    """Entry point when run as ``python -m app.services.watcher``."""
    try:
        asyncio.run(watch_loop())
    except KeyboardInterrupt:
        logger.info("Watcher stopped by user.")
    except Exception:
        logger.exception("Watcher crashed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
