"""
File Router.

Handles file download and deletion from local temp storage.
"""

import logging
import re
import unicodedata
from pathlib import Path

from fastapi import APIRouter, Depends, Response
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.auth import CurrentUser, get_current_user
from app.config import get_settings
from app.errors import AppError
from app.file_service import delete_local_output, resolve_local_output
from app.job_service import clear_job_output, get_job
from app.response import success_response

logger = logging.getLogger("media_loader_api.files")
router = APIRouter(prefix="/files", tags=["files"])

settings = get_settings()


def build_download_filename(job: dict, file_path: Path) -> str:
    """Build the user-facing filename without exposing the restricted temp name."""
    title = unicodedata.normalize("NFC", str(job.get("title") or "").strip())
    if not title:
        return str(job.get("output_filename") or file_path.name)

    safe_title = re.sub(r'[<>:"/\\|?*\x00-\x1f\x7f]', "_", title).rstrip(" .")
    if not safe_title:
        return str(job.get("output_filename") or file_path.name)

    extension = file_path.suffix
    if not extension:
        output_format = str(job.get("output_format") or "").lower()
        if re.fullmatch(r"[a-z0-9]{1,8}", output_format):
            extension = f".{output_format}"

    if extension and safe_title.casefold().endswith(extension.casefold()):
        return safe_title
    return f"{safe_title}{extension}"


@router.get("/download/{job_id}")
async def download_file(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    """Download a completed file from local temp storage.

    Args:
        job_id: The job ID to download the file for

    Returns:
        File response with the downloaded file

    Raises:
        HTTPException: If file not found or job not completed
    """
    job = get_job(job_id, user_id=current_user.id, include_internal=True)
    if not job:
        raise AppError(404, "JOB_NOT_FOUND", "ไม่พบงานนี้")

    if job.get("status") != "COMPLETED":
        raise AppError(409, "JOB_NOT_COMPLETED", "งานนี้ยังประมวลผลไม่เสร็จ")

    output_path = job.get("output_path")
    if not output_path:
        raise AppError(
            410,
            "FILE_NO_LONGER_AVAILABLE",
            "ไฟล์ชั่วคราวถูกนำออกแล้ว แต่ประวัติยังคงอยู่",
        )

    file_path = resolve_local_output(output_path, settings.resolved_temp_dir)
    if not file_path.exists() or not file_path.is_file():
        clear_job_output(job_id, user_id=current_user.id)
        raise AppError(410, "FILE_NO_LONGER_AVAILABLE", "ไม่พบไฟล์ชั่วคราวนี้แล้ว")

    output_filename = build_download_filename(job, file_path)

    logger.info("Serving local output for job %s", job_id)

    return FileResponse(
        path=file_path,
        filename=output_filename,
        media_type="application/octet-stream",
        background=BackgroundTask(
            _remove_delivered_file,
            str(file_path),
            job_id,
            current_user.id,
        ),
    )


def _remove_delivered_file(path: str, job_id: str, user_id: str) -> None:
    try:
        delete_local_output(path, settings.resolved_temp_dir)
    finally:
        clear_job_output(job_id, user_id=user_id)


@router.delete("/delete/{job_id}")
async def delete_file(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Delete a completed file from local temp storage.

    Args:
        job_id: The job ID to delete the file for

    Returns:
        Success message

    Raises:
        HTTPException: If file not found or deletion fails
    """
    job = get_job(job_id, user_id=current_user.id, include_internal=True)
    if not job:
        raise AppError(404, "JOB_NOT_FOUND", "ไม่พบงานนี้")

    output_path = job.get("output_path")
    if not output_path:
        raise AppError(410, "FILE_NO_LONGER_AVAILABLE", "ไม่มีไฟล์ชั่วคราวให้ลบ")

    try:
        delete_local_output(output_path, settings.resolved_temp_dir)
        clear_job_output(job_id, user_id=current_user.id)
        return success_response(data={"deleted": True})
    except AppError:
        raise
    except Exception as error:
        logger.error("Failed to delete job output: %s", type(error).__name__)
        raise AppError(500, "FILE_DELETE_FAILED", "ไม่สามารถลบไฟล์ชั่วคราวได้")
