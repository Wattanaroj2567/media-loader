"""
Worker configuration loaded from environment variables.

Uses pydantic-settings to validate env vars at startup.
Never prints or logs secret values.
"""

from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Media Loader Worker settings.

    Values are loaded from environment variables.
    In Docker, these come from .env.local via docker-compose env_file.
    """

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Worker identity
    worker_id: str = "local-worker-1"
    worker_secret: str = ""

    # Media processing
    max_file_size_mb: int = 500
    temp_dir: str = "/app/tmp/media-loader"
    media_output_mode: str = "local_temp"
    media_storage_bucket: str = "media-downloads"
    temp_file_retention_minutes: int = 60

    # Polling
    poll_interval_seconds: int = 5
    job_timeout_minutes: int = 30

    # Logging
    log_level: str = "info"

    @property
    def resolved_temp_dir(self) -> Path:
        """Resolve temp_dir to an absolute path and ensure it exists."""
        path = Path(self.temp_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    model_config = {
        "env_file": ".env.local",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    def has_supabase(self) -> bool:
        """Check if Supabase credentials are configured (without printing them)."""
        return bool(self.supabase_url) and bool(self.supabase_service_role_key)


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
