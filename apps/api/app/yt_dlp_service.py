"""
yt-dlp Media Extraction Service.

Extracts metadata and format information safely.
Enforces restricted options (no cookies, no playlist, timeout).
"""

import asyncio
import time
import logging
import re
from typing import Any
import yt_dlp
from yt_dlp.networking.impersonate import ImpersonateTarget

from app.errors import AppError
from app.schemas import MediaMetadata, FormatInfo

logger = logging.getLogger("media_loader_api.yt_dlp")

STATS_PATTERN = re.compile(
    r'^[\d.,\sKkMmBb·]+(?:views|reactions|likes|comments|shares)(?:[\d.,\sKkMmBb·]+(?:views|reactions|likes|comments|shares))?$',
    re.IGNORECASE
)


def clean_extracted_title(title: str) -> str:
    """Clean yt-dlp extracted title, e.g. stripping Facebook stats prefix."""
    if not title:
        return title
    if " | " in title:
        parts = title.split(" | ", 1)
        left = parts[0].strip()
        if STATS_PATTERN.match(left):
            return parts[1].strip()
    return title


# Maximum app-level retries with backoff for platforms that rate-limit (e.g. TikTok)
_MAX_EXTRACT_ATTEMPTS = 3
_RETRY_DELAY_SECONDS = 5


def _run_yt_dlp_sync(url: str) -> dict[str, Any]:
    """Run yt-dlp in a synchronous context with strict safety limits.

    Retries up to _MAX_EXTRACT_ATTEMPTS times with a short delay between
    attempts to handle transient rate-limiting from platforms like TikTok.
    """

    base_opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,  # We need format details
        "noplaylist": True,
        "socket_timeout": 15,   # Allow time for redirect chains
        "cookiefile": None,     # Explicitly no cookies
        "retries": 0,           # We handle retries at the app level with backoff
        "fragment_retries": 0,
    }

    # Try with impersonate target if available
    try_impersonate = True
    last_error: Exception | None = None

    for attempt in range(1, _MAX_EXTRACT_ATTEMPTS + 1):
        ydl_opts = dict(base_opts)
        if try_impersonate:
            try:
                ydl_opts["impersonate"] = ImpersonateTarget.from_str("chrome")
            except Exception:
                try_impersonate = False

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if not info:
                    raise ValueError("No metadata returned from yt-dlp")
                return info
        except Exception as error:
            last_error = error
            error_msg = str(error)
            # If error is due to impersonate target missing, disable impersonate immediately without backoff delay
            if try_impersonate and "Impersonate target" in error_msg:
                logger.info("Impersonate target unavailable, falling back to standard extraction.")
                try_impersonate = False
                continue

            logger.warning(
                "yt-dlp extraction attempt %d/%d failed: %s",
                attempt, _MAX_EXTRACT_ATTEMPTS, type(error).__name__,
            )
            if attempt < _MAX_EXTRACT_ATTEMPTS:
                time.sleep(_RETRY_DELAY_SECONDS)

    raise last_error  # type: ignore[misc]


def _as_positive_int(value: Any) -> int | None:
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def _as_non_negative_int(value: Any) -> int | None:
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        return None
    return number if number >= 0 else None


def _normalize_height(height: int) -> int:
    """Normalize non-standard video heights to standard video resolution heights."""
    standards = [144, 240, 360, 480, 720, 1080, 1440, 2160, 4320]
    nearest = min(standards, key=lambda x: abs(x - height))
    if abs(nearest - height) / nearest <= 0.10:
        return nearest
    return height


def _codec_label(codec: str | None) -> str | None:
    if not codec or codec == "none":
        return None
    return codec.split(".")[0].upper()


def _video_preference(raw_format: dict[str, Any]) -> tuple[int, int, int, int]:
    extension = str(raw_format.get("ext") or "").lower()
    codec = str(raw_format.get("vcodec") or "").lower()
    return (
        1 if extension == "mp4" else 0,
        1 if codec.startswith(("avc", "h264", "hev", "h265")) else 0,
        1 if raw_format.get("acodec") in (None, "none") else 0,
        _as_positive_int(raw_format.get("tbr")) or 0,
    )


def normalize_extractor_result(
    raw_info: dict[str, Any],
) -> tuple[MediaMetadata, list[FormatInfo]]:
    """Normalize yt-dlp output into unique, display-ready real formats."""
    duration = _as_positive_int(raw_info.get("duration"))
    media = MediaMetadata(
        title=clean_extracted_title(raw_info.get("title") or "Untitled media"),
        platform=raw_info.get("extractor_key")
        or raw_info.get("extractor")
        or "unknown",
        thumbnail_url=raw_info.get("thumbnail"),
        duration_seconds=duration,
        uploader=raw_info.get("uploader")
        or raw_info.get("channel")
        or raw_info.get("creator"),
        source_domain=raw_info.get("webpage_url_domain")
        or raw_info.get("extractor"),
        view_count=_as_positive_int(raw_info.get("view_count")),
        like_count=_as_non_negative_int(raw_info.get("like_count")),
    )

    video_by_quality: dict[tuple[int, int | None], tuple[dict[str, Any], FormatInfo]] = {}
    audio_by_quality: dict[tuple[int | None, str | None], FormatInfo] = {}

    raw_formats = raw_info.get("formats") or []
    if not raw_formats and raw_info.get("url"):
        # Synthesize a default format for platforms with single media URLs (like IG/TikTok/FB)
        raw_formats = [{
            "format_id": "default",
            "url": raw_info.get("url"),
            "ext": raw_info.get("ext") or "mp4",
            "vcodec": raw_info.get("vcodec") or "h264",
            "acodec": raw_info.get("acodec") or "aac",
            "height": raw_info.get("height"),
            "width": raw_info.get("width"),
            "fps": raw_info.get("fps") or 30,
            "filesize": raw_info.get("filesize") or raw_info.get("filesize_approx"),
            "tbr": raw_info.get("tbr") or raw_info.get("average_bitrate"),
        }]

    for raw_format in raw_formats:
        format_id = str(raw_format.get("format_id") or "")
        if not format_id:
            continue

        video_codec = raw_format.get("vcodec")
        audio_codec = raw_format.get("acodec")
        has_video = bool(video_codec and video_codec != "none")
        has_audio = bool(audio_codec and audio_codec != "none")
        if not has_video and not has_audio:
            continue

        extension = str(raw_format.get("ext") or "unknown")
        filesize = _as_positive_int(
            raw_format.get("filesize") or raw_format.get("filesize_approx")
        )

        if has_video:
            raw_height = _as_positive_int(raw_format.get("height")) or _as_positive_int(raw_info.get("height"))
            if raw_height is None:
                # If width is present, guess height (9:16 or 16:9), else default to 720p
                width = _as_positive_int(raw_format.get("width")) or _as_positive_int(raw_info.get("width"))
                if width:
                    raw_height = int(width * 16 / 9) if width <= 1080 else int(width * 9 / 16)
                else:
                    raw_height = 720
            
            height = _normalize_height(raw_height)
            width = _as_positive_int(raw_format.get("width")) or _as_positive_int(raw_info.get("width"))
            fps = _as_positive_int(raw_format.get("fps"))
            bitrate = _as_positive_int(raw_format.get("tbr"))
            quality_label = f"{height}p"
            if fps:
                quality_label += f" · {fps} FPS"

            normalized = FormatInfo(
                format_id=format_id,
                type="video",
                extension=extension,
                resolution=f"{width}x{height}" if width else f"{height}p",
                quality_label=quality_label,
                width=width,
                height=height,
                fps=fps,
                bitrate=bitrate,
                video_codec=video_codec,
                audio_codec=audio_codec if has_audio else None,
                filesize=filesize,
                has_video=True,
                has_audio=has_audio,
            )
            key = (height, fps)
            existing = video_by_quality.get(key)
            if existing is None or _video_preference(raw_format) > _video_preference(
                existing[0]
            ):
                video_by_quality[key] = (raw_format, normalized)
            continue

        bitrate = _as_positive_int(raw_format.get("abr") or raw_format.get("tbr"))
        codec_label = _codec_label(audio_codec)
        quality_label = f"{bitrate} kbps" if bitrate else "Original audio"
        if codec_label:
            quality_label += f" · {codec_label}"
        normalized = FormatInfo(
            format_id=format_id,
            type="audio",
            extension=extension,
            quality_label=quality_label,
            bitrate=bitrate,
            audio_codec=audio_codec,
            filesize=filesize,
            has_audio=True,
        )
        key = (bitrate, codec_label)
        existing = audio_by_quality.get(key)
        if existing is None or (
            extension in {"m4a", "mp4"} and existing.extension not in {"m4a", "mp4"}
        ):
            audio_by_quality[key] = normalized

    videos = [item[1] for item in video_by_quality.values()]
    videos.sort(key=lambda item: (item.height or 0, item.fps or 0), reverse=True)
    audio = list(audio_by_quality.values())
    audio.sort(key=lambda item: item.bitrate or 0, reverse=True)
    return media, [*videos, *audio]


async def extract_metadata(url: str) -> tuple[MediaMetadata, list[FormatInfo]]:
    """Extract media metadata and formats asynchronously."""
    loop = asyncio.get_running_loop()
    try:
        raw_info = await loop.run_in_executor(None, _run_yt_dlp_sync, url)
    except Exception as error:
        raise AppError(
            status_code=422,
            code="ANALYSIS_FAILED",
            message="ไม่สามารถอ่านข้อมูลสื่อนี้ได้ โปรดตรวจสอบว่าลิงก์เป็นสาธารณะและลองอีกครั้ง",
        ) from error
    return normalize_extractor_result(raw_info)
