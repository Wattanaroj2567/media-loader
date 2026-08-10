"""
Pydantic request/response schemas for Media Loader API.

These define the contract between frontend and backend.
"""

from pydantic import BaseModel, Field, HttpUrl


# ─── Request schemas ───


class AnalyzeRequest(BaseModel):
    """Request body for POST /media/analyze."""

    url: HttpUrl


class DownloadRequest(BaseModel):
    """Request body for POST /downloads."""

    url: HttpUrl
    selected_format_id: str
    output_format: str = "mp4"
    rights_confirmed: bool = False


# ─── Response data schemas ───


class PolicyResult(BaseModel):
    """Policy check result."""

    decision: str = Field(description="allowed | blocked | needs_confirmation")
    reason: str


class MediaMetadata(BaseModel):
    """Basic media metadata returned from analysis."""

    title: str | None = None
    platform: str = "unknown"
    thumbnail_url: str | None = None
    duration_seconds: int | None = None
    uploader: str | None = None
    source_domain: str | None = None
    view_count: int | None = None
    like_count: int | None = None


class FormatInfo(BaseModel):
    """A single available format option."""

    format_id: str
    type: str = Field(description="video | audio")
    extension: str = "mp4"
    resolution: str | None = None
    quality_label: str
    width: int | None = None
    height: int | None = None
    fps: int | None = None
    bitrate: int | None = None
    video_codec: str | None = None
    audio_codec: str | None = None
    filesize: int | None = None
    has_video: bool = False
    has_audio: bool = False


class AnalyzeResponseData(BaseModel):
    """Response data for POST /media/analyze."""

    policy: PolicyResult
    media: MediaMetadata
    formats: list[FormatInfo] = Field(default_factory=list)


class DownloadResponseData(BaseModel):
    """Response data for POST /downloads."""

    job_id: str
    status: str = "QUEUED"
