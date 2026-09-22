"""Download job endpoints.

POST /downloads — Create a new download job.
GET  /downloads — List user's jobs.
GET  /downloads/{job_id} — Get job detail.
"""

import uuid

from fastapi import APIRouter, Depends, Header

from app.auth import CurrentUser, get_current_user, get_current_user_optional
from app.config import get_settings
from app.errors import AppError
from app.job_service import (
    cancel_job,
    create_job,
    delete_job,
    get_job,
    list_jobs,
    pause_job,
    resume_job,
)
from app.policy_logger import log_decision
from app.response import success_response
from app.schemas import DownloadRequest, DownloadResponseData, FormatInfo
from app.url_policy import check_url
from app.yt_dlp_service import extract_metadata

router = APIRouter(prefix="/downloads", tags=["downloads"])


def is_format_compatible(format_info: FormatInfo, output_format: str) -> bool:
    """Check whether a selected source format can produce the requested output."""
    if output_format == "mp3":
        return format_info.type == "audio" or (
            format_info.type == "video" and format_info.has_audio
        )
    if output_format == "gif":
        return format_info.type == "video"
    return format_info.type == "video"


@router.post("")
async def create_download_job_endpoint(
    request: DownloadRequest,
    current_user: CurrentUser | None = Depends(get_current_user_optional),
    guest_session_id: str | None = Header(default=None, alias="x-guest-session-id"),
):
    """Create a new download job (for logged-in users or guests)."""
    if request.output_format not in {"mp4", "mp3", "gif"}:
        raise AppError(400, "INVALID_OUTPUT_FORMAT", "รองรับเฉพาะ MP4, MP3 และ GIF")

    if not request.rights_confirmed:
        raise AppError(
            400,
            "RIGHTS_NOT_CONFIRMED",
            "กรุณายืนยันสิทธิ์ในสื่อก่อนดำเนินการดาวน์โหลด",
        )

    effective_user_id = current_user.id if current_user else None
    effective_guest_id = (
        None if effective_user_id else (guest_session_id or str(uuid.uuid4()))
    )

    url = str(request.url)
    policy = check_url(url)
    log_decision(url, policy, effective_user_id)
    if policy.decision == "blocked":
        raise AppError(403, "POLICY_BLOCKED", policy.reason)

    media, formats = await extract_metadata(url)
    selected = next(
        (item for item in formats if item.format_id == request.selected_format_id),
        None,
    )
    if not selected:
        raise AppError(
            409,
            "FORMAT_UNAVAILABLE",
            "คุณภาพที่เลือกไม่มีอยู่แล้ว กรุณาวิเคราะห์ลิงก์ใหม่",
        )
    if request.output_format == "gif" and not media.is_animated_gif:
        raise AppError(
            400,
            "FORMAT_TYPE_MISMATCH",
            "เลือก GIF ได้เฉพาะสื่อที่ต้นทางระบุว่าเป็น GIF",
        )
    if not is_format_compatible(selected, request.output_format):
        raise AppError(
            400,
            "FORMAT_TYPE_MISMATCH",
            (
                "รูปแบบที่เลือกไม่มีแทร็กเสียงสำหรับแปลงเป็น MP3"
                if request.output_format == "mp3"
                else "ประเภทไฟล์ที่เลือกไม่ตรงกับรูปแบบผลลัพธ์"
            ),
        )

    job_id = create_job(
        user_id=effective_user_id,
        guest_session_id=effective_guest_id,
        url=url,
        format_id=selected.format_id,
        output_format=request.output_format,
        title=media.title or "Untitled media",
        platform=media.platform,
        uploader=media.uploader,
        source_domain=media.source_domain,
        thumbnail_url=media.thumbnail_url,
        duration_seconds=media.duration_seconds,
        media_type=selected.type,
        selected_quality=selected.quality_label,
        selected_has_audio=selected.has_audio,
        rights_confirmed=request.rights_confirmed,
    )

    data = DownloadResponseData(job_id=job_id, status="QUEUED")
    return success_response(data=data.model_dump())


@router.get("")
async def list_download_jobs_endpoint(
    status: str | None = None,
    q: str | None = None,
    limit: int = 20,
    offset: int = 0,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List download jobs (requires authentication for history)."""
    jobs = list_jobs(
        user_id=current_user.id,
        status=status,
        query=q,
        limit=limit,
        offset=offset,
    )

    return success_response(
        data={
            "jobs": jobs,
            "total": len(jobs),
            "limit": limit,
            "offset": offset,
        }
    )


@router.get("/{job_id}")
async def get_download_job_endpoint(
    job_id: str,
    current_user: CurrentUser | None = Depends(get_current_user_optional),
    guest_session_id: str | None = Header(default=None, alias="x-guest-session-id"),
):
    """Get a single download job detail."""
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise AppError(401, "AUTH_REQUIRED", "จำเป็นต้องระบุข้อมูลผู้ใช้หรือเซสชัน")

    job = get_job(job_id, user_id=user_id, guest_session_id=guest_session_id)
    if not job:
        raise AppError(404, "JOB_NOT_FOUND", "ไม่พบงานนี้")
    return success_response(data=job)


@router.post("/{job_id}/cancel")
async def cancel_download_job_endpoint(
    job_id: str,
    current_user: CurrentUser | None = Depends(get_current_user_optional),
    guest_session_id: str | None = Header(default=None, alias="x-guest-session-id"),
):
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise AppError(401, "AUTH_REQUIRED", "จำเป็นต้องระบุข้อมูลผู้ใช้หรือเซสชัน")

    return success_response(
        data=cancel_job(job_id, user_id=user_id, guest_session_id=guest_session_id)
    )


@router.post("/{job_id}/pause")
async def pause_download_job_endpoint(
    job_id: str,
    current_user: CurrentUser | None = Depends(get_current_user_optional),
    guest_session_id: str | None = Header(default=None, alias="x-guest-session-id"),
):
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise AppError(401, "AUTH_REQUIRED", "จำเป็นต้องระบุข้อมูลผู้ใช้หรือเซสชัน")

    return success_response(
        data=pause_job(job_id, user_id=user_id, guest_session_id=guest_session_id)
    )


@router.post("/{job_id}/resume")
async def resume_download_job_endpoint(
    job_id: str,
    current_user: CurrentUser | None = Depends(get_current_user_optional),
    guest_session_id: str | None = Header(default=None, alias="x-guest-session-id"),
):
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise AppError(401, "AUTH_REQUIRED", "จำเป็นต้องระบุข้อมูลผู้ใช้หรือเซสชัน")

    return success_response(
        data=resume_job(job_id, user_id=user_id, guest_session_id=guest_session_id)
    )


@router.delete("/{job_id}")
async def delete_download_job_endpoint(
    job_id: str,
    current_user: CurrentUser | None = Depends(get_current_user_optional),
    guest_session_id: str | None = Header(default=None, alias="x-guest-session-id"),
):
    user_id = current_user.id if current_user else None
    if not user_id and not guest_session_id:
        raise AppError(401, "AUTH_REQUIRED", "จำเป็นต้องระบุข้อมูลผู้ใช้หรือเซสชัน")

    deleted = delete_job(
        job_id,
        user_id=user_id,
        guest_session_id=guest_session_id,
        temp_root=get_settings().resolved_temp_dir,
    )
    return success_response(data={"deleted": deleted})
