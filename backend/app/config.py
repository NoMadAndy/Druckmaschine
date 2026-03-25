from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/druckmaschine"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "change-me-in-production-use-a-real-secret-key"
    OPENAI_API_KEY: str = ""
    GPU_ENABLED: bool = False
    VERSION: str = "0.1.0"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    LOG_FILE: str = "/app/logs/app.log"
    LOG_LEVEL: str = "INFO"
    STATIC_DIR: str = "/app/static"
    CORS_ORIGINS: list[str] = ["*"]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
