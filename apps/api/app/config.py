"""
Application configuration loaded from environment variables.

Uses pydantic-settings to validate env vars at startup.
Never prints or logs secret values.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Media Loader API settings.

    Values are loaded from environment variables.
    In Docker, these come from .env.local via docker-compose env_file.
    """

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # CORS
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # API
    api_port: int = 8000
    log_level: str = "info"

    # Worker (read here for health check awareness)
    worker_id: str = "local-worker-1"

    # Media output
    media_output_mode: str = "local_temp"
    temp_dir: str = "tmp"
    max_file_size_mb: int = 500
    temp_file_retention_minutes: int = 60

    @property
    def resolved_temp_dir(self) -> str:
        """Resolve temp_dir to an absolute path and ensure it exists."""
        import os
        path = os.path.abspath(self.temp_dir)
        os.makedirs(path, exist_ok=True)
        return path

    model_config = {
        "env_file": ".env.local",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def has_supabase(self) -> bool:
        """Check if Supabase credentials are configured (without printing them)."""
        return bool(self.supabase_url) and bool(self.supabase_service_role_key)


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
