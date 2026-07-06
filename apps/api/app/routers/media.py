"""Media analysis endpoint.

POST /media/analyze — Validates a URL, runs policy check, and returns
metadata + available formats.
"""

from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user
from app.errors import AppError
from app.response import success_response
from app.schemas import (
    AnalyzeRequest,
    AnalyzeResponseData,
    MediaMetadata,
)
from app.url_policy import check_url
from app.policy_logger import log_decision
from app.yt_dlp_service import extract_metadata

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/analyze")
async def analyze_media(
    request: AnalyzeRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Analyze a media URL.

    Flow: URL validation → policy check → metadata extraction → format list.
    """
    url_str = str(request.url)

    # Run policy check
    policy = check_url(url_str)
    
    # Log decision to Supabase
    log_decision(url_str, policy, current_user.id)

    # If blocked, return immediately with no formats
    if policy.decision == "blocked":
        data = AnalyzeResponseData(
            policy=policy,
            media=MediaMetadata(title="Restricted Content", platform="blocked"),
            formats=[],
        )
        return success_response(data=data.model_dump())

    # Extract real metadata and formats using yt-dlp
    media, formats = await extract_metadata(url_str)

    data = AnalyzeResponseData(policy=policy, media=media, formats=formats)
    return success_response(data=data.model_dump())
