"""Retention cleanup for local temporary and Cloudflare R2 media outputs."""

import logging
import shutil
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable

from worker.job_queue import clear_job_output
from worker.r2_storage import delete_r2_object
from worker.supabase_client import get_supabase_client

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


def cleanup_expired_r2_outputs(
    retention_minutes: int,
    *,
    now: datetime | None = None,
    object_deleter: Callable[[str | None, str | None], bool] = delete_r2_object,
    output_clearer: Callable[[str], object] = clear_job_output,
) -> int:
    """Delete expired R2 job outputs and clear their persisted metadata."""
    supabase = get_supabase_client()
    if not supabase:
        return 0
    current_time = now if now is not None else datetime.now(timezone.utc)
    cutoff = (current_time - timedelta(minutes=max(retention_minutes, 1))).isoformat()
    deleted_count = 0
    try:
        result = (
            supabase.table("download_jobs")
            .select("id,storage_bucket,storage_path")
            .eq("status", "COMPLETED")
            .not_.is_("storage_bucket", "null")
            .not_.is_("storage_path", "null")
            .lt("completed_at", cutoff)
            .limit(100)
            .execute()
        )
    except Exception as error:
        logger.warning("Skipped R2 retention scan: %s", type(error).__name__)
        return 0

    for row in result.data or []:
        job_id = row.get("id")
        bucket = row.get("storage_bucket")
        key = row.get("storage_path")
        if not job_id or not bucket or not key:
            continue
        if object_deleter(bucket, key):
            output_clearer(job_id)
            deleted_count += 1

    if deleted_count:
        logger.info("Removed %s expired R2 job outputs", deleted_count)
    return deleted_count
