"""Retention cleanup for local temporary media outputs."""

import logging
import shutil
import time
from pathlib import Path
from typing import Callable

from worker.job_queue import clear_job_output

logger = logging.getLogger("media_loader_worker.cleanup")


def _latest_output_mtime(job_dir: Path) -> float:
    timestamps = [job_dir.stat().st_mtime]
    for child in job_dir.iterdir():
        if child.is_file() and not child.is_symlink():
            timestamps.append(child.stat().st_mtime)
    return max(timestamps)


def cleanup_expired_outputs(
    temp_root: Path,
    retention_minutes: int,
    *,
    now: float | None = None,
    output_clearer: Callable[[str], object] = clear_job_output,
) -> int:
    """Delete expired job directories and clear their persisted temp paths."""
    root = temp_root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    cutoff = (time.time() if now is None else now) - max(
        retention_minutes,
        1,
    ) * 60
    deleted_count = 0

    for candidate in root.iterdir():
        try:
            if candidate.is_symlink() or not candidate.is_dir():
                continue
            candidate.resolve().relative_to(root)
            if _latest_output_mtime(candidate) >= cutoff:
                continue
            job_id = candidate.name
            shutil.rmtree(candidate)
            output_clearer(job_id)
            deleted_count += 1
        except (FileNotFoundError, OSError, ValueError) as error:
            logger.warning(
                "Skipped temp cleanup for %s: %s",
                candidate.name,
                type(error).__name__,
            )

    if deleted_count:
        logger.info("Removed %s expired temporary job outputs", deleted_count)
    return deleted_count
