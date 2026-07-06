"""Download job endpoints.

POST /downloads — Create a new download job.
GET  /downloads — List user's jobs.
GET  /downloads/{job_id} — Get job detail.
"""

from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user
from app.config import get_settings
from app.errors import AppError
from app.response import success_response
from app.schemas import DownloadRequest, DownloadResponseData
from app.job_service import cancel_job, create_job, delete_job, get_job, list_jobs, pause_job, resume_job
from app.policy_logger import log_decision
from app.url_policy import check_url
from app.yt_dlp_service import extract_metadata

router = APIRouter(prefix="/downloads", tags=["downloads"])


@router.post("")
async def create_download_job_endpoint(
    request: DownloadRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new download job."""
    if request.output_format not in {"mp4", "mp3"}:
        raise AppError(400, "INVALID_OUTPUT_FORMAT", "รองรับเฉพาะ MP4 และ MP3")

    url = str(request.url)
    policy = check_url(url)
    log_decision(url, policy, current_user.id)
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
    expected_type = "audio" if request.output_format == "mp3" else "video"
    if selected.type != expected_type:
        raise AppError(
            400,
            "FORMAT_TYPE_MISMATCH",
            "ประเภทไฟล์ที่เลือกไม่ตรงกับรูปแบบผลลัพธ์",
        )

    job_id = create_job(
        user_id=current_user.id,
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
    """List download jobs."""
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
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single download job detail."""
    job = get_job(job_id, user_id=current_user.id)
    if not job:
        raise AppError(404, "JOB_NOT_FOUND", "ไม่พบงานนี้")
    return success_response(data=job)


@router.post("/{job_id}/cancel")
async def cancel_download_job_endpoint(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    return success_response(data=cancel_job(job_id, user_id=current_user.id))


@router.post("/{job_id}/pause")
async def pause_download_job_endpoint(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    return success_response(data=pause_job(job_id, user_id=current_user.id))


@router.post("/{job_id}/resume")
async def resume_download_job_endpoint(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    return success_response(data=resume_job(job_id, user_id=current_user.id))


@router.delete("/{job_id}")
async def delete_download_job_endpoint(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    deleted = delete_job(
        job_id,
        user_id=current_user.id,
        temp_root=get_settings().resolved_temp_dir,
    )
    return success_response(data={"deleted": deleted})
