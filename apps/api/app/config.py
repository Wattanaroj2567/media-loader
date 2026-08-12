"""
Application configuration loaded from environment variables.

Uses pydantic-settings to validate env vars at startup.
Never prints or logs secret values.
"""

from functools import lru_cache
from pathlib import Path
import re
import shutil

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
    worker_pool: str = ""
    railway_environment_id: str = ""
    node_path: str = ""
    deno_path: str = ""

    # Media output
    media_output_mode: str = "local_temp"
    temp_dir: str = "tmp/media-loader"
    max_file_size_mb: int = 500
    temp_file_retention_minutes: int = 60

    @property
    def resolved_temp_dir(self) -> Path:
        """Resolve the shared output directory from the repository root.

        API and worker have different working directories in Docker, so a
        relative value must never be resolved from the current directory.
        """
        configured_path = Path(self.temp_dir).expanduser()
        project_root = Path(__file__).resolve().parents[3]
        path = (
            configured_path
            if configured_path.is_absolute()
            else project_root / configured_path
        )
        path.mkdir(parents=True, exist_ok=True)
        return path.resolve()

    @property
    def resolved_worker_pool(self) -> str:
        """Return a safe queue pool name for the current runtime."""
        configured = self.worker_pool.strip().lower()
        candidate = configured or (
            "railway" if self.railway_environment_id.strip() else "local"
        )
        normalized = re.sub(r"[^a-z0-9_-]+", "-", candidate).strip("-")
        return normalized or "local"

    @property
    def queue_target_marker(self) -> str:
        """Marker stored in locked_by while a job is waiting for its pool."""
        return f"pool:{self.resolved_worker_pool}"

    @staticmethod
    def _configured_executable(value: str, filename: str) -> Path | None:
        if not value.strip():
            return None
        configured = Path(value).expanduser()
        if configured.is_dir():
            candidates = (configured / filename, configured / f"{filename}.exe")
            configured = next((path for path in candidates if path.is_file()), configured)
        return configured.resolve() if configured.is_file() else None

    @property
    def resolved_js_runtime(self) -> tuple[str, Path] | None:
        """Return a supported runtime and executable for yt-dlp analysis."""
        for runtime_name, configured_path in (
            ("deno", self.deno_path),
            ("node", self.node_path),
        ):
            configured = self._configured_executable(configured_path, runtime_name)
            discovered = configured or shutil.which(runtime_name)
            if discovered:
                return runtime_name, Path(discovered).resolve()
        return None

    model_config = {
        "env_file": (".env.local", "../../.env.local"),
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
