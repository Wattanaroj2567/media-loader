"""
Job Queue Service.

Handles polling for queued jobs, locking, and status updates.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from worker.supabase_client import get_supabase_client
from worker.config import get_settings

logger = logging.getLogger("media_loader_worker.job_queue")


def poll_queued_job() -> dict | None:
    """Poll for a queued job and lock it for processing.

    Returns the job data if a job was successfully claimed, None otherwise.
    """
    supabase = get_supabase_client()
    if not supabase:
        logger.error("Supabase client not configured")
        return None

    settings = get_settings()
    worker_id = settings.worker_id
    now = datetime.now(timezone.utc)
    timeout_threshold = now - timedelta(minutes=settings.job_timeout_minutes)

    try:
        # Find a QUEUED job that is not locked or whose lock has expired
        result = (
            supabase.table("download_jobs")
            .select("*")
            .eq("status", "QUEUED")
            .or_(f"locked_by.is.null,locked_at.lt.{timeout_threshold.isoformat()}")
            .order("created_at", desc=False)
            .limit(1)
            .execute()
        )

        if not result.data:
            return None

        job = result.data[0]
        job_id = job["id"]

        # Try to claim the job with optimistic locking
        update_data = {
            "status": "DOWNLOADING",
            "locked_by": worker_id,
            "locked_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        # Update only if still QUEUED and not locked by another worker
        update_result = (
            supabase.table("download_jobs")
            .update(update_data)
            .eq("id", job_id)
            .eq("status", "QUEUED")
            .execute()
        )

        if not update_result.data:
            # Job was claimed by another worker
            logger.debug(f"Job {job_id} was claimed by another worker")
            return None

        logger.info(f"Claimed job {job_id} for worker {worker_id}")
        return update_result.data[0]

    except Exception as e:
        logger.error(f"Failed to poll queued job: {e}")
        return None


def update_job_status(job_id: str, status: str, error_message: str = None, **metadata: Any) -> bool:
    """Update job status and optional metadata.

    Returns True if update succeeded, False otherwise.
    """
    supabase = get_supabase_client()
    if not supabase:
        logger.error("Supabase client not configured")
        return False

    settings = get_settings()
    now = datetime.now(timezone.utc)

    update_data = {
        "status": status,
        "updated_at": now.isoformat(),
    }

    if error_message:
        update_data["error_message"] = error_message

    # Add any additional metadata
    for key, value in metadata.items():
        update_data[key] = value

    try:
        if status != "CANCELLED" and is_job_cancelled(job_id):
            logger.info("Skipped status %s for cancelled job %s", status, job_id)
            return False
        (
            supabase.table("download_jobs")
            .update(update_data)
            .eq("id", job_id)
            .execute()
        )
        logger.info(f"Updated job {job_id} to status {status}")
        return True
    except Exception as e:
        logger.error(f"Failed to update job {job_id}: {e}")
        return False


def get_job_status(job_id: str) -> str | None:
    supabase = get_supabase_client()
    if not supabase:
        return "NETWORK_ERROR"
    try:
        result = (
            supabase.table("download_jobs")
            .select("status")
            .eq("id", job_id)
            .limit(1)
            .execute()
        )
        return result.data[0]["status"] if result.data else None
    except Exception as error:
        logger.error("Failed to read job status: %s", type(error).__name__)
        return "NETWORK_ERROR"


def is_job_cancelled(job_id: str) -> bool:
    """A missing, cancelled, or paused job is treated as cancelled so worker stops processing."""
    status = get_job_status(job_id)
    return status is None or status in ("CANCELLED", "PAUSED")


def update_job_progress(
    job_id: str,
    progress: int,
    download_speed: float | None = None,
    file_size: int | None = None,
) -> bool:
    metadata = {}
    if download_speed is not None:
        try:
            metadata["download_speed"] = int(download_speed)
        except (ValueError, TypeError):
            pass
    if file_size is not None:
        try:
            metadata["file_size"] = int(file_size)
        except (ValueError, TypeError):
            pass
    return update_job_status(
        job_id,
        "DOWNLOADING",
        progress=max(0, min(progress, 99)),
        **metadata
    )


def clear_job_output(job_id: str) -> bool:
    """Clear a completed job's local path after delivery or retention cleanup."""
    supabase = get_supabase_client()
    if not supabase:
        return False
    try:
        (
            supabase.table("download_jobs")
            .update(
                {
                    "storage_path": None,
                    "storage_bucket": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .eq("id", job_id)
            .eq("status", "COMPLETED")
            .execute()
        )
        return True
    except Exception as error:
        logger.error(
            "Failed to clear output for job %s: %s",
            job_id,
            type(error).__name__,
        )
        return False


def release_job_lock(job_id: str) -> bool:
    """Release the lock on a job.

    Returns True if release succeeded, False otherwise.
    """
    supabase = get_supabase_client()
    if not supabase:
        return False

    try:
        supabase.table("download_jobs").update({
            "locked_by": None,
            "locked_at": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", job_id).execute()
        logger.info(f"Released lock on job {job_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to release lock on job {job_id}: {e}")
        return False
