import asyncio
import logging
import os
from collections import deque
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any

from app.config import get_settings

settings = get_settings()


class LogService:
    MAX_BUFFER_SIZE = 5000

    def __init__(self) -> None:
        self._buffer: deque[str] = deque(maxlen=self.MAX_BUFFER_SIZE)
        self._subscribers: list[asyncio.Queue] = []
        self._lock = asyncio.Lock()
        self._logger: logging.Logger | None = None

    def setup(self) -> logging.Logger:
        if self._logger:
            return self._logger

        log_path = Path(settings.LOG_FILE)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        logger = logging.getLogger("druckmaschine")
        logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

        if not logger.handlers:
            file_handler = RotatingFileHandler(
                str(log_path),
                maxBytes=10 * 1024 * 1024,  # 10 MB
                backupCount=5,
                encoding="utf-8",
            )
            file_handler.setLevel(logging.DEBUG)
            file_formatter = logging.Formatter(
                "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)

            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.INFO)
            console_formatter = logging.Formatter(
                "%(asctime)s | %(levelname)-8s | %(message)s",
                datefmt="%H:%M:%S",
            )
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)

            ws_handler = WebSocketLogHandler(self)
            ws_handler.setLevel(logging.DEBUG)
            ws_handler.setFormatter(file_formatter)
            logger.addHandler(ws_handler)

        self._logger = logger
        return logger

    def get_logger(self, name: str = "druckmaschine") -> logging.Logger:
        if not self._logger:
            self.setup()
        return logging.getLogger(name)

    def add_to_buffer(self, message: str) -> None:
        self._buffer.append(message)
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                pass

    def get_buffer(self, count: int = 100, level: str | None = None) -> list[str]:
        lines = list(self._buffer)
        if level:
            level_upper = level.upper()
            lines = [ln for ln in lines if level_upper in ln]
        return lines[-count:]

    def add_subscriber(self, queue: asyncio.Queue) -> None:
        self._subscribers.append(queue)

    def remove_subscriber(self, queue: asyncio.Queue) -> None:
        if queue in self._subscribers:
            self._subscribers.remove(queue)

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)

    def info(self, message: str, source: str = "app") -> None:
        logger = self.get_logger(source)
        logger.info(message)

    def warning(self, message: str, source: str = "app") -> None:
        logger = self.get_logger(source)
        logger.warning(message)

    def error(self, message: str, source: str = "app") -> None:
        logger = self.get_logger(source)
        logger.error(message)

    def debug(self, message: str, source: str = "app") -> None:
        logger = self.get_logger(source)
        logger.debug(message)


class WebSocketLogHandler(logging.Handler):
    def __init__(self, log_service: "LogService") -> None:
        super().__init__()
        self._log_service = log_service

    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = self.format(record)
            self._log_service.add_to_buffer(msg)
        except Exception:
            self.handleError(record)


log_service = LogService()
