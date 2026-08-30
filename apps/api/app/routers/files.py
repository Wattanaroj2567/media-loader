"""
File Router.

Handles file download and deletion from local temp storage.
"""

import logging
import re
import unicodedata
from pathlib import Path

from fastapi import APIRouter, Depends, Header, Query, Response
from fastapi.responses import FileResponse

from app.auth import CurrentUser, generate_download_token, get_current_user, verify_download_token
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


@router.get("/token/{job_id}")
async def get_download_token(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Generate a one-time secure download token for direct browser streaming."""
    job = get_job(job_id, user_id=current_user.id, include_internal=False)
    if not job:
        raise AppError(404, "JOB_NOT_FOUND", "ไม่พบงานนี้")

    if job.get("status") != "COMPLETED":
        raise AppError(409, "JOB_NOT_COMPLETED", "งานนี้ยังประมวลผลไม่เสร็จ")

    token = generate_download_token(job_id, current_user.id, expires_in_seconds=300)
    return success_response(
        data={
            "job_id": job_id,
            "download_token": token,
            "download_url": f"/files/download/{job_id}?token={token}",
            "expires_in": 300,
        }
    )


@router.get("/download/{job_id}")
async def download_file(
    job_id: str,
    token: str | None = Query(default=None),
    authorization: str | None = Header(default=None),
) -> Response:
    """Download a completed file from local temp storage via direct streaming or bearer auth."""
    user_id: str
    if token:
        user_id = verify_download_token(token, job_id)
    elif authorization:
        current_user = await get_current_user(authorization)
        user_id = current_user.id
    else:
        raise AppError(401, "AUTH_REQUIRED", "กรุณาระบุ token หรือเข้าสู่ระบบ")

    job = get_job(job_id, user_id=user_id, include_internal=True)
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
        clear_job_output(job_id, user_id=user_id)
        raise AppError(410, "FILE_NO_LONGER_AVAILABLE", "ไม่พบไฟล์ชั่วคราวนี้แล้ว")

    output_filename = build_download_filename(job, file_path)

    logger.info("Serving direct local output for job %s to user %s", job_id, user_id)

    return FileResponse(
        path=file_path,
        filename=output_filename,
        media_type="application/octet-stream",
    )


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
