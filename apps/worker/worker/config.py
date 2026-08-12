"""
Worker configuration loaded from environment variables.

Uses pydantic-settings to validate env vars at startup.
Never prints or logs secret values.
"""

from functools import lru_cache
from pathlib import Path
import re
import shutil

import imageio_ffmpeg
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
    worker_pool: str = ""
    railway_environment_id: str = ""
    worker_secret: str = ""
    node_path: str = ""
    deno_path: str = ""
    ffmpeg_path: str = ""

    # Media processing
    max_file_size_mb: int = 500
    temp_dir: str = "tmp/media-loader"
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
        """Resolve the shared output directory from the repository root."""
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
        """Marker accepted by this worker while a job is queued."""
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
    def resolved_node_executable(self) -> Path | None:
        """Resolve the Node runtime used by yt-dlp's YouTube EJS solver."""
        configured = self._configured_executable(self.node_path, "node")
        if configured:
            return configured
        discovered = shutil.which("node")
        return Path(discovered).resolve() if discovered else None

    @property
    def resolved_deno_executable(self) -> Path | None:
        """Resolve the preferred Deno runtime used by yt-dlp's EJS solver."""
        configured = self._configured_executable(self.deno_path, "deno")
        if configured:
            return configured
        discovered = shutil.which("deno")
        return Path(discovered).resolve() if discovered else None

    @property
    def resolved_js_runtime(self) -> tuple[str, Path] | None:
        """Return a supported runtime and executable for yt-dlp."""
        if deno := self.resolved_deno_executable:
            return "deno", deno
        if node := self.resolved_node_executable:
            return "node", node
        return None

    @property
    def resolved_ffmpeg_executable(self) -> Path:
        """Resolve FFmpeg without requiring a machine-wide installation."""
        configured = self._configured_executable(self.ffmpeg_path, "ffmpeg")
        if configured:
            return configured
        discovered = shutil.which("ffmpeg")
        if discovered:
            return Path(discovered).resolve()
        return Path(imageio_ffmpeg.get_ffmpeg_exe()).resolve()

    model_config = {
        "env_file": (".env.local", "../../.env.local"),
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
