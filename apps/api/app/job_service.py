"""
Job Service.

Handles creating and retrieving download jobs from Supabase.
"""

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.errors import AppError
from app.file_service import delete_local_output, local_output_exists
from app.supabase_client import get_supabase_client

logger = logging.getLogger("media_loader_api.job_service")

CANCELLABLE_STATUSES = {
    "PENDING",
    "ANALYZING",
    "READY",
    "QUEUED",
    "DOWNLOADING",
    "CONVERTING",
    "UPLOADING",
    "PAUSED",
}
DELETABLE_STATUSES = {
    "PENDING",
    "READY",
    "QUEUED",
    "COMPLETED",
    "FAILED",
    "BLOCKED",
    "CANCELLED",
    "PAUSED",
}


def can_cancel_job(status: str) -> bool:
    return status in CANCELLABLE_STATUSES


def can_delete_job(status: str) -> bool:
    return status in DELETABLE_STATUSES


def _database():
    supabase = get_supabase_client()
    if not supabase:
        raise AppError(
            status_code=503,
            code="DB_UNAVAILABLE",
            message="ฐานข้อมูลงานดาวน์โหลดยังไม่พร้อมใช้งาน",
        )
    return supabase


def create_job(
    *,
    user_id: str,
    url: str,
    format_id: str,
    output_format: str,
    title: str,
    platform: str,
    uploader: str | None,
    source_domain: str | None,
    thumbnail_url: str | None,
    duration_seconds: int | None,
    media_type: str,
    selected_quality: str,
    selected_has_audio: bool,
) -> str:
    """Create a new download job in Supabase."""
    supabase = _database()

    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    job_data: dict[str, Any] = {
        "id": job_id,
        "user_id": user_id,
        "original_url": url,
        "title": title,
        "platform": platform,
        "uploader": uploader,
        "source_domain": source_domain,
        "thumbnail_url": thumbnail_url,
        "duration_seconds": duration_seconds,
        "media_type": media_type,
        "status": "QUEUED",
        "selected_format_id": format_id,
        "selected_quality": selected_quality,
        "selected_has_audio": selected_has_audio,
        "output_format": output_format,
        "rights_confirmed": True,
        "created_at": now,
        "updated_at": now,
    }

    try:
        supabase.table("download_jobs").insert(job_data).execute()
        logger.info("Created job %s for user %s", job_id, user_id)
        return job_id
    except AppError:
        raise
    except Exception as error:
        logger.error("Failed to insert job: %s", type(error).__name__)
        raise AppError(
            status_code=500,
            code="DB_INSERT_FAILED",
            message="ไม่สามารถเพิ่มงานลงคิวได้",
        ) from error


def _normalize_job(job: dict, *, include_internal: bool = False) -> dict:
    if not job:
        return job
    job = dict(job)
    if "file_size" in job and job["file_size"] is not None:
        job["file_size_mb"] = round(job["file_size"] / (1024 * 1024), 2)
    if "selected_format_id" in job and "selected_format" not in job:
        job["selected_format"] = job["selected_format_id"]
    storage_path = job.get("storage_path")
    # Local output metadata can remain after retention cleanup. Do not expose a
    # share/download action until the owner-scoped file is still deliverable.
    job["file_available"] = local_output_exists(
        storage_path,
        get_settings().resolved_temp_dir,
    )
    if storage_path:
        job["output_filename"] = Path(storage_path).name
    if include_internal:
        job["output_path"] = storage_path
    else:
        job.pop("storage_path", None)
        job.pop("storage_bucket", None)
    return job


def list_jobs(
    *,
    user_id: str,
    limit: int = 50,
    offset: int = 0,
    status: str | None = None,
    query: str | None = None,
) -> list[dict]:
    """List recent download jobs."""
    supabase = _database()
    try:
        request = (
            supabase.table("download_jobs")
            .select("*")
            .eq("user_id", user_id)
        )
        if status:
            request = request.eq("status", status)
        result = (
            request.order("created_at", desc=True)
            .range(offset, offset + min(max(limit, 1), 100) - 1)
            .execute()
        )
        jobs = [_normalize_job(job) for job in result.data]
        if query:
            needle = query.casefold().strip()
            jobs = [
                job
                for job in jobs
                if needle
                in " ".join(
                    str(job.get(field) or "")
                    for field in (
                        "title",
                        "original_url",
                        "platform",
                        "uploader",
                        "source_domain",
                        "output_filename",
                    )
                ).casefold()
            ]
        return jobs
    except AppError:
        raise
    except Exception as error:
        logger.error("Failed to list jobs: %s", type(error).__name__)
        raise AppError(500, "JOB_LIST_FAILED", "ไม่สามารถโหลดรายการงานได้") from error


def get_job(
    job_id: str, *, user_id: str, include_internal: bool = False
) -> dict | None:
    """Get a single job by ID."""
    supabase = _database()
    try:
        result = (
            supabase.table("download_jobs")
            .select("*")
            .eq("id", job_id)
            .eq("user_id", user_id)
            .execute()
        )
        data = result.data
        return (
            _normalize_job(data[0], include_internal=include_internal)
            if data
            else None
        )
    except AppError:
        raise
    except Exception as error:
        logger.error("Failed to get job %s: %s", job_id, type(error).__name__)
        raise AppError(500, "JOB_READ_FAILED", "ไม่สามารถอ่านข้อมูลงานได้") from error


def update_job_status(
    job_id: str, status: str, *, user_id: str, **kwargs: Any
) -> dict:
    """Update job status and metadata in Supabase."""
    supabase = _database()
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    for key, value in kwargs.items():
        update_data[key] = value

    try:
        result = (
            supabase.table("download_jobs")
            .update(update_data)
            .eq("id", job_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not result.data:
            raise AppError(404, "JOB_NOT_FOUND", "ไม่พบงานนี้")
        return _normalize_job(result.data[0])
    except AppError:
        raise
    except Exception as error:
        logger.error("Failed to update job %s: %s", job_id, type(error).__name__)
        raise AppError(500, "JOB_UPDATE_FAILED", "ไม่สามารถอัปเดตงานได้") from error


def cancel_job(job_id: str, *, user_id: str) -> dict:
    job = get_job(job_id, user_id=user_id)
    if not job:
        raise AppError(404, "JOB_NOT_FOUND", "ไม่พบงานนี้")
    if not can_cancel_job(job["status"]):
        raise AppError(
            409,
            "JOB_NOT_CANCELLABLE",
            "งานนี้เสร็จสิ้นแล้วและไม่สามารถยกเลิกได้",
        )
    return update_job_status(
        job_id,
        "CANCELLED",
        user_id=user_id,
        locked_by=None,
        locked_at=None,
    )


def delete_job(job_id: str, *, user_id: str, temp_root: str | Path) -> bool:
    job = get_job(job_id, user_id=user_id, include_internal=True)
    if not job:
        raise AppError(404, "JOB_NOT_FOUND", "ไม่พบงานนี้")
    if not can_delete_job(job["status"]):
        raise AppError(
            409,
            "JOB_STILL_RUNNING",
            "กรุณายกเลิกงานที่กำลังทำงานก่อนลบ",
        )
    try:
        delete_local_output(job.get("output_path"), temp_root)
    except AppError as error:
        if error.code != "UNSAFE_FILE_PATH":
            raise
        # A historical path from another deployment must never be deleted, but
        # it also must not prevent the owner from removing their history row.
        logger.warning("Skipped unsafe output while deleting job %s", job_id)
    try:
        (
            _database()
            .table("download_jobs")
            .delete()
            .eq("id", job_id)
            .eq("user_id", user_id)
            .execute()
        )
        return True
    except Exception as error:
        logger.error("Failed to delete job %s: %s", job_id, type(error).__name__)
        raise AppError(500, "JOB_DELETE_FAILED", "ไม่สามารถลบรายการได้") from error


def clear_job_output(job_id: str, *, user_id: str) -> None:
    try:
        update_job_status(
            job_id,
            "COMPLETED",
            user_id=user_id,
            storage_path=None,
            storage_bucket=None,
        )
    except AppError:
        logger.warning("Could not clear delivered output for job %s", job_id)


PAUSABLE_STATUSES = {"PENDING", "READY", "QUEUED", "DOWNLOADING", "CONVERTING"}
RESUMABLE_STATUSES = {"PAUSED"}


def pause_job(job_id: str, *, user_id: str) -> dict:
    job = get_job(job_id, user_id=user_id)
    if not job:
        raise AppError(404, "JOB_NOT_FOUND", "ไม่พบงานนี้")
    if job["status"] not in PAUSABLE_STATUSES:
        raise AppError(
            409,
            "JOB_NOT_PAUSABLE",
            "ไม่สามารถหยุดงานนี้ชั่วคราวได้",
        )
    return update_job_status(
        job_id,
        "PAUSED",
        user_id=user_id,
        locked_by=None,
        locked_at=None,
    )


def resume_job(job_id: str, *, user_id: str) -> dict:
    job = get_job(job_id, user_id=user_id)
    if not job:
        raise AppError(404, "JOB_NOT_FOUND", "ไม่พบงานนี้")
    if job["status"] not in RESUMABLE_STATUSES:
        raise AppError(
            409,
            "JOB_NOT_RESUMABLE",
            "ไม่สามารถดาวน์โหลดงานนี้ต่อได้",
        )
    return update_job_status(
        job_id,
        "QUEUED",
        user_id=user_id,
        locked_by=None,
        locked_at=None,
    )
