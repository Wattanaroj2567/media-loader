"""
yt-dlp Media Extraction Service.

Extracts metadata and format information safely.
Enforces restricted options (no cookies, no playlist, timeout).
"""

import asyncio
import logging
import re
import time
from typing import Any
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

import yt_dlp
from yt_dlp.networking.impersonate import ImpersonateTarget
from yt_dlp.utils import parse_count

from app.config import get_settings
from app.errors import AppError
from app.schemas import FormatInfo, MediaMetadata

logger = logging.getLogger("media_loader_api.yt_dlp")

STATS_PATTERN = re.compile(
    r"^[\d.,\sKkMmBb·]+(?:views|reactions|likes|comments|shares)(?:[\d.,\sKkMmBb·]+(?:views|reactions|likes|comments|shares))?$",
    re.IGNORECASE,
)
STAT_VALUE_PATTERN = re.compile(
    r"(?P<value>[\d.,]+\s*[KkMmBb]?)\s*(?P<kind>views|reactions|likes|comments|shares)",
    re.IGNORECASE,
)
INSTAGRAM_MEDIA_PATH_PATTERN = re.compile(
    r"^/(?P<kind>reel|p|tv)/(?P<shortcode>[A-Za-z0-9_-]+)(?:/|$)",
    re.IGNORECASE,
)
INSTAGRAM_VIEW_COUNT_PATTERN = re.compile(
    rb'\\?"video_view_count\\?"\s*:\s*(?P<count>\d+)',
)
_MAX_INSTAGRAM_EMBED_BYTES = 1_000_000

_INPUT_PLATFORM_BY_HOST = {
    "youtube.com": "Youtube",
    "youtu.be": "Youtube",
    "instagram.com": "Instagram",
    "tiktok.com": "TikTok",
    "facebook.com": "Facebook",
    "fb.watch": "Facebook",
    "x.com": "X",
    "twitter.com": "X",
    "bilibili.com": "Bilibili",
    "b23.tv": "Bilibili",
    "vk.com": "VK Video",
    "vkvideo.ru": "VK Video",
    "giphy.com": "Giphy",
}


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


def _facebook_title_counts(raw_info: dict[str, Any]) -> dict[str, int]:
    """Read the public engagement labels Facebook exposes in Reel metadata."""
    source = " ".join(
        str(raw_info.get(key) or "")
        for key in ("extractor_key", "extractor", "webpage_url_domain")
    ).lower()
    if "facebook" not in source:
        return {}

    title = str(raw_info.get("title") or "")
    stats_prefix = title.split(" | ", 1)[0]
    if not STATS_PATTERN.fullmatch(stats_prefix):
        return {}

    counts: dict[str, int] = {}
    for match in STAT_VALUE_PATTERN.finditer(stats_prefix):
        count = _as_non_negative_int(parse_count(match.group("value")))
        if count is not None:
            counts[match.group("kind").lower()] = count
    return counts


def _is_animated_gif(raw_info: dict[str, Any]) -> bool:
    """Detect explicit GIF media, including X GIFs served as silent MP4 files."""
    declared_types = (
        raw_info.get("media_type"),
        raw_info.get("type"),
        raw_info.get("ext"),
        raw_info.get("video_ext"),
    )
    if any(
        str(value or "").lower() in {"gif", "animated_gif"} for value in declared_types
    ):
        return True

    if any(
        urlsplit(str(raw_info.get(key) or "")).path.lower().endswith(".gif")
        for key in ("original_url", "webpage_url")
    ):
        return True

    for raw_format in raw_info.get("formats") or []:
        if str(raw_format.get("ext") or "").lower() == "gif":
            return True
        source_path = urlsplit(str(raw_format.get("url") or "")).path.lower()
        if "/tweet_video/" in source_path:
            return True
    return False


def _platform_name(raw_info: dict[str, Any]) -> str:
    input_url = str(raw_info.get("_media_loader_input_url") or "")
    input_host = (urlsplit(input_url).hostname or "").lower().removeprefix("www.")
    for host, platform_name in _INPUT_PLATFORM_BY_HOST.items():
        if input_host == host or input_host.endswith(f".{host}"):
            return platform_name

    platform = str(
        raw_info.get("extractor_key") or raw_info.get("extractor") or "unknown"
    )
    source_domain = str(raw_info.get("webpage_url_domain") or "").lower()
    if platform.lower() == "generic" and (
        source_domain == "giphy.com" or source_domain.endswith(".giphy.com")
    ):
        return "Giphy"
    return platform


def _source_domain(raw_info: dict[str, Any]) -> str | None:
    """Prefer the domain the user submitted over a redirected extractor domain."""
    input_url = str(raw_info.get("_media_loader_input_url") or "")
    input_host = (urlsplit(input_url).hostname or "").lower().removeprefix("www.")
    if input_host:
        return input_host
    return raw_info.get("webpage_url_domain") or raw_info.get("extractor")


def _instagram_embed_view_count(url: str) -> int | None:
    """Read the real public Reel view count exposed by Instagram's embed page."""
    parsed = urlsplit(url)
    hostname = (parsed.hostname or "").lower()
    if hostname != "instagram.com" and not hostname.endswith(".instagram.com"):
        return None

    media_match = INSTAGRAM_MEDIA_PATH_PATTERN.match(parsed.path)
    if not media_match:
        return None

    media_kind = media_match.group("kind").lower()
    shortcode = media_match.group("shortcode")
    embed_url = f"https://www.instagram.com/{media_kind}/{shortcode}/embed/"
    request = Request(
        embed_url,
        headers={
            "Accept": "text/html",
            # Instagram's lightweight public embed response includes the
            # view count; the full browser response currently omits it.
            "User-Agent": "Mozilla/5.0",
        },
    )
    with urlopen(request, timeout=15) as response:
        webpage = response.read(_MAX_INSTAGRAM_EMBED_BYTES + 1)
    if len(webpage) > _MAX_INSTAGRAM_EMBED_BYTES:
        return None

    count_match = INSTAGRAM_VIEW_COUNT_PATTERN.search(webpage)
    if not count_match:
        return None
    return int(count_match.group("count"))


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
        # Keep analysis formats aligned with the client used by the worker.
        "extractor_args": {
            "youtube": {"player_client": ["web_embedded"]},
        },
        "socket_timeout": 15,  # Allow time for redirect chains
        "cookiefile": None,  # Explicitly no cookies
        "retries": 0,  # We handle retries at the app level with backoff
        "fragment_retries": 0,
    }
    if js_runtime := get_settings().resolved_js_runtime:
        runtime_name, runtime_executable = js_runtime
        base_opts["js_runtimes"] = {
            runtime_name: {"path": str(runtime_executable)},
        }

    impersonate_targets = [
        "edge-101:windows-10",
        "chrome-131:android-14",
        "firefox-135:macos-14",
        "safari-17.2:ios-17.2",
    ]
    last_error: Exception | None = None

    for attempt in range(1, _MAX_EXTRACT_ATTEMPTS + 1):
        ydl_opts = dict(base_opts)
        target_idx = (attempt - 1) % len(impersonate_targets)
        target_name = impersonate_targets[target_idx]
        try:
            ydl_opts["impersonate"] = ImpersonateTarget.from_str(target_name)
            ydl_opts["http_headers"] = {"Referer": url}
        except Exception:
            pass

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if not info:
                    raise ValueError("No metadata returned from yt-dlp")
                if info.get("view_count") is None:
                    try:
                        instagram_view_count = _instagram_embed_view_count(url)
                    except Exception as error:
                        logger.debug(
                            "Instagram public embed view count unavailable: %s",
                            type(error).__name__,
                        )
                    else:
                        if instagram_view_count is not None:
                            info = dict(info)
                            info["view_count"] = instagram_view_count
                return info
        except Exception as error:
            last_error = error
            logger.warning(
                "yt-dlp extraction attempt %d/%d failed with target %s: %s",
                attempt,
                _MAX_EXTRACT_ATTEMPTS,
                target_name,
                type(error).__name__,
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


def _normalize_audio_bitrate(
    raw_format: dict[str, Any],
    filesize: int | None,
    duration: int | None,
) -> int | None:
    """Keep unreliable extractor bitrate values from misleading the UI."""
    bitrate = _as_positive_int(raw_format.get("abr") or raw_format.get("tbr"))
    if bitrate is None or bitrate <= 10_000:
        return bitrate
    if filesize and duration:
        return _as_positive_int(filesize * 8 / duration / 1000)
    return None


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
    facebook_counts = _facebook_title_counts(raw_info)
    media = MediaMetadata(
        title=clean_extracted_title(raw_info.get("title") or "Untitled media"),
        platform=_platform_name(raw_info),
        thumbnail_url=raw_info.get("thumbnail"),
        duration_seconds=duration,
        uploader=raw_info.get("uploader")
        or raw_info.get("channel")
        or raw_info.get("creator"),
        source_domain=_source_domain(raw_info),
        view_count=facebook_counts.get("views")
        if "views" in facebook_counts
        else _as_non_negative_int(raw_info.get("view_count")),
        like_count=_as_non_negative_int(raw_info.get("like_count")),
        reaction_count=facebook_counts.get("reactions"),
        is_animated_gif=_is_animated_gif(raw_info),
    )

    video_by_quality: dict[
        tuple[int, int | None], tuple[dict[str, Any], FormatInfo]
    ] = {}
    audio_by_quality: dict[tuple[int | None, str | None], FormatInfo] = {}

    raw_formats = raw_info.get("formats") or []
    if not raw_formats and raw_info.get("url"):
        # Synthesize a default format for platforms with single media URLs (like IG/TikTok/FB)
        raw_formats = [
            {
                "format_id": str(raw_info.get("format_id") or "default"),
                "url": raw_info.get("url"),
                "ext": raw_info.get("ext") or "mp4",
                "vcodec": raw_info.get("vcodec"),
                "acodec": raw_info.get("acodec"),
                "height": raw_info.get("height"),
                "width": raw_info.get("width"),
                "fps": raw_info.get("fps"),
                "filesize": raw_info.get("filesize") or raw_info.get("filesize_approx"),
                "tbr": raw_info.get("tbr") or raw_info.get("average_bitrate"),
            }
        ]

    for raw_format in raw_formats:
        format_id = str(raw_format.get("format_id") or "")
        if not format_id:
            continue

        extension = str(raw_format.get("ext") or "unknown")
        video_codec = raw_format.get("vcodec")
        audio_codec = raw_format.get("acodec")
        has_video = bool(video_codec and video_codec != "none")
        has_audio = bool(audio_codec and audio_codec != "none")
        declared_video_extension = str(raw_info.get("video_ext") or "").lower()
        is_codec_unknown_video = (
            not has_video
            and not has_audio
            and declared_video_extension not in {"", "none"}
            and extension.lower() == declared_video_extension
        )
        if is_codec_unknown_video:
            has_video = True
        if not has_video and not has_audio:
            continue

        filesize = _as_positive_int(
            raw_format.get("filesize") or raw_format.get("filesize_approx")
        )

        if has_video:
            raw_height = _as_positive_int(raw_format.get("height")) or _as_positive_int(
                raw_info.get("height")
            )
            if raw_height is None and not is_codec_unknown_video:
                # If width is present, guess height (9:16 or 16:9), else default to 720p
                width = _as_positive_int(raw_format.get("width")) or _as_positive_int(
                    raw_info.get("width")
                )
                if width:
                    raw_height = (
                        int(width * 16 / 9) if width <= 1080 else int(width * 9 / 16)
                    )
                else:
                    raw_height = 720

            height = _normalize_height(raw_height) if raw_height is not None else None
            width = _as_positive_int(raw_format.get("width")) or _as_positive_int(
                raw_info.get("width")
            )
            fps = _as_positive_int(raw_format.get("fps"))
            bitrate = _as_positive_int(raw_format.get("tbr"))
            quality_label = f"{height}p" if height is not None else "Original video"
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
            key = (height or 0, fps)
            existing = video_by_quality.get(key)
            if existing is None or _video_preference(raw_format) > _video_preference(
                existing[0]
            ):
                video_by_quality[key] = (raw_format, normalized)
            continue

        bitrate = _normalize_audio_bitrate(raw_format, filesize, duration)
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
            message="Unable to extract media metadata. Please verify that the link is public and try again.",
        ) from error
    # yt-dlp can follow a platform redirect (for example a VK page embedding
    # YouTube media). Keep the submitted URL so the UI reports the platform the
    # user actually pasted while still using the extractor's real formats.
    raw_info = dict(raw_info)
    raw_info["_media_loader_input_url"] = url
    return normalize_extractor_result(raw_info)
