"""
Media Processor.

Handles download and conversion operations using yt-dlp and FFmpeg.
"""

import asyncio
import logging
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

import yt_dlp
from yt_dlp.networking.impersonate import ImpersonateTarget

from worker.config import get_settings
from worker.job_queue import (
    get_job_status,
    is_job_cancelled,
    update_job_progress,
    update_job_status,
)

logger = logging.getLogger("media_loader_worker.processor")

settings = get_settings()


TERMINAL_STATUSES = {"COMPLETED", "FAILED", "BLOCKED", "CANCELLED"}
SOURCE_DOWNLOAD_ATTEMPTS = 2
SOURCE_RETRY_DELAY_SECONDS = 1.0


class JobCancelled(Exception):
    """Raised when the API marks a running job as cancelled."""


class MediaDownloadError(Exception):
    """Safe source-download error that can be persisted with the job."""


def is_terminal_status(status: str) -> bool:
    return status in TERMINAL_STATUSES


def build_format_selector(
    format_id: str,
    output_format: str,
    selected_has_audio: bool = False,
    selected_has_video: bool = False,
) -> str:
    if output_format == "mp4":
        if format_id == "best":
            return "bestvideo+bestaudio[ext=m4a]/bestvideo+bestaudio/best"
        if selected_has_audio:
            return f"{format_id}/best"
        # Prioritize AAC m4a audio stream to allow direct stream copy (mux) without re-encoding
        return f"{format_id}+bestaudio[ext=m4a]/{format_id}+bestaudio/{format_id}/best"
    if output_format == "gif":
        return "bestvideo/best" if format_id == "best" else format_id
    if format_id == "best":
        return "bestaudio/best"
    if selected_has_video and selected_has_audio:
        return "bestaudio/best"
    return format_id


def classify_download_error(error: Exception) -> str:
    """Convert extractor details into a safe, useful job error."""
    message = str(error).casefold()
    if "403" in message or "forbidden" in message:
        return "แหล่งวิดีโอปฏิเสธการดาวน์โหลด (HTTP 403)"
    if "javascript runtime" in message or "challenge" in message:
        return "ไม่สามารถประมวลผลการตรวจสอบ JavaScript ของแหล่งวิดีโอได้"
    if "ffmpeg" in message:
        return "ไม่พบ FFmpeg สำหรับรวมไฟล์วิดีโอและเสียง"
    return "ดาวน์โหลดจากแหล่งต้นทางไม่สำเร็จ"


def is_retryable_source_error(error: Exception) -> bool:
    """Return whether a fresh extraction can recover the source request."""
    message = str(error).casefold()
    return "403" in message or "forbidden" in message


def calculate_download_progress(progress_data: dict) -> int:
    downloaded = progress_data.get("downloaded_bytes") or 0
    total = progress_data.get("total_bytes") or progress_data.get(
        "total_bytes_estimate"
    )
    if not total:
        return 0
    return max(0, min(99, int(downloaded / total * 100)))


def create_progress_hook(
    job_id: str,
    *,
    cancellation_checker: Callable[[str], bool] = is_job_cancelled,
    progress_updater: Callable[
        [str, int, float | None, int | None], object
    ] = update_job_progress,
):
    last_progress = -1
    last_cancel_check_time = 0.0
    cancel_check_interval = 1.0  # Check cancellation every 1.0s for instant response
    is_cancelled_cached = False

    def hook(progress_data: dict) -> None:
        nonlocal last_progress, last_cancel_check_time, is_cancelled_cached

        now = time.time()
        if now - last_cancel_check_time >= cancel_check_interval:
            is_cancelled_cached = cancellation_checker(job_id)
            last_cancel_check_time = now

        if is_cancelled_cached:
            raise JobCancelled(f"Job {job_id} was cancelled")

        status = progress_data.get("status")
        if status == "finished":
            # Streams are downloaded. The worker is now merging or post-processing (FFmpeg)
            update_job_status(job_id, "CONVERTING")
            return

        if status != "downloading":
            return
        progress = calculate_download_progress(progress_data)
        speed = progress_data.get("speed")
        total = progress_data.get("total_bytes") or progress_data.get(
            "total_bytes_estimate"
        )

        if progress >= last_progress + 2 or progress == 99:
            progress_updater(job_id, progress, speed, total)
            last_progress = progress

    return hook


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to remove unsafe characters."""
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, "_")
    return filename


def is_valid_media(file_path: Path) -> bool:
    """Return whether a downloaded file opens as real media.

    Sources sometimes answer with an HTML error page saved under a media
    extension (seen with Giphy previews). Decoding the first seconds with
    FFmpeg rejects that garbage fast without reading whole files.
    """
    try:
        result = subprocess.run(
            [
                str(settings.resolved_ffmpeg_executable),
                "-v",
                "error",
                "-i",
                str(file_path),
                "-t",
                "3",
                "-f",
                "null",
                "-",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=60,
        )
        return result.returncode == 0
    except Exception:
        return False


def ffmpeg_error_tail(log_path: Path, limit: int = 500) -> str:
    """Read the tail of a captured FFmpeg log as one safe line."""
    try:
        data = log_path.read_bytes()[-2048:]
        text = data.decode("utf-8", errors="replace")
        return " ".join(text.split())[-limit:]
    except Exception:
        return ""


def get_file_size_mb(file_path: Path) -> float:
    return file_path.stat().st_size / (1024 * 1024)


def is_direct_giphy_gif_url(url: str) -> bool:
    """Return whether URL is a public Giphy CDN GIF that must stay a GIF."""
    parsed = urlsplit(url)
    hostname = (parsed.hostname or "").lower()
    return (
        parsed.scheme == "https"
        and (hostname == "giphy.com" or hostname.endswith(".giphy.com"))
        and parsed.path.lower().endswith(".gif")
    )


def _download_direct_giphy_gif(url: str, output_path: Path, job_id: str) -> Path:
    """Stream a native Giphy GIF without yt-dlp replacing it with an MP4 preview."""
    request = Request(
        url,
        headers={
            "Accept": "image/gif,image/*;q=0.9,*/*;q=0.8",
            "User-Agent": "MediaLoader/1.0",
        },
    )
    target = output_path / "giphy.gif"
    partial = output_path / "giphy.gif.part"
    max_bytes = settings.max_file_size_mb * 1024 * 1024

    try:
        with urlopen(request, timeout=30) as response:
            final_url = response.geturl()
            if not is_direct_giphy_gif_url(final_url):
                raise MediaDownloadError("Giphy เปลี่ยนเส้นทางไปยังแหล่งไฟล์ที่ไม่ปลอดภัย")

            content_length_value = response.headers.get("Content-Length")
            content_length = int(content_length_value) if content_length_value else None
            if content_length is not None and content_length > max_bytes:
                raise MediaDownloadError("ไฟล์จากต้นทางมีขนาดเกินกำหนด")

            downloaded = 0
            with partial.open("wb") as output:
                while chunk := response.read(256 * 1024):
                    if is_job_cancelled(job_id):
                        raise JobCancelled(f"Job {job_id} was cancelled")
                    downloaded += len(chunk)
                    if downloaded > max_bytes:
                        raise MediaDownloadError("ไฟล์จากต้นทางมีขนาดเกินกำหนด")
                    output.write(chunk)
                    if content_length:
                        progress = min(99, int(downloaded / content_length * 100))
                        update_job_progress(
                            job_id,
                            progress,
                            None,
                            content_length,
                        )

        with partial.open("rb") as downloaded_file:
            if downloaded_file.read(6) not in {b"GIF87a", b"GIF89a"}:
                raise MediaDownloadError("ไฟล์ที่ได้รับจาก Giphy ไม่ใช่ GIF")
        partial.replace(target)
        return target
    except Exception:
        partial.unlink(missing_ok=True)
        raise


async def download_media(
    url: str,
    output_path: Path,
    format_id: str,
    job_id: str,
    output_format: str = "mp4",
    selected_has_audio: bool = False,
    selected_has_video: bool = False,
) -> Optional[Path]:
    """Download media using yt-dlp in restricted mode.

    Args:
        url: Media URL
        output_path: Directory to save the file
        format_id: Format identifier from yt-dlp
        output_format: Target output format (mp4, mp3, gif)

    Returns:
        Path to downloaded file, or None if failed
    """
    logger.info(
        f"Downloading from {url} with format {format_id} (target: {output_format})"
    )

    if output_format == "gif" and is_direct_giphy_gif_url(url):
        try:
            return await asyncio.to_thread(
                _download_direct_giphy_gif,
                url,
                output_path,
                job_id,
            )
        except (JobCancelled, MediaDownloadError):
            raise
        except Exception as error:
            if is_job_cancelled(job_id):
                raise JobCancelled(f"Job {job_id} was cancelled") from error
            logger.error(
                "Direct Giphy GIF download failed (%s)",
                type(error).__name__,
            )
            raise MediaDownloadError(classify_download_error(error)) from error

    format_selector = build_format_selector(
        format_id,
        output_format,
        selected_has_audio,
        selected_has_video,
    )

    ydl_opts = {
        "format": format_selector,
        "merge_output_format": "mp4",
        "outtmpl": str(output_path / "%(title)s.%(ext)s"),
        "restrictfilenames": True,
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
        "ignoreerrors": False,
        # This public client exposes the adaptive formats analyzed by the API
        # and avoids source-side 403 responses seen with android_vr.
        "extractor_args": {
            "youtube": {"player_client": ["web_embedded"]},
        },
        "progress_hooks": [create_progress_hook(job_id)],
        # Force maximum-quality 320kbps AAC when transcoding incompatible audio streams (like OPUS/webm to MP4)
        "postprocessor_args": {"merger": ["-c:a", "aac", "-b:a", "320k"]},
        # Security: No cookies, no login bypass
        "nocheckcertificate": False,
        "socket_timeout": 30,
        # Network resilience: retry on connection/fragment drops and resume incomplete files
        "retries": 30,
        "fragment_retries": 30,
        "continuedl": True,
        "ffmpeg_location": str(settings.resolved_ffmpeg_executable),
    }
    js_runtime = settings.resolved_js_runtime
    if js_runtime:
        runtime_name, runtime_executable = js_runtime
        ydl_opts["js_runtimes"] = {
            runtime_name: {"path": str(runtime_executable)},
        }

    impersonate_targets = [
        "edge-101:windows-10",
        "chrome-131:android-14",
        "firefox-135:macos-14",
        "safari-17.2:ios-17.2",
    ]

    for attempt in range(1, SOURCE_DOWNLOAD_ATTEMPTS + 1):
        attempt_opts = dict(ydl_opts)
        target_idx = (attempt - 1) % len(impersonate_targets)
        target_name = impersonate_targets[target_idx]
        try:
            attempt_opts["impersonate"] = ImpersonateTarget.from_str(target_name)
            attempt_opts["http_headers"] = {"Referer": url}
        except Exception:
            pass

        try:
            with yt_dlp.YoutubeDL(attempt_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                if info:
                    # Get the actual downloaded filename
                    filename = ydl.prepare_filename(info)
                    downloaded_path = Path(filename)
                    if downloaded_path.exists():
                        logger.info(f"Downloaded to {downloaded_path}")
                        return downloaded_path
                    else:
                        # Try to find the file by pattern
                        for file in output_path.iterdir():
                            if file.is_file():
                                logger.info(f"Found downloaded file {file}")
                                return file
                return None
        except JobCancelled:
            raise
        except Exception as error:
            if is_job_cancelled(job_id):
                raise JobCancelled(f"Job {job_id} was cancelled") from error
            if attempt < SOURCE_DOWNLOAD_ATTEMPTS and is_retryable_source_error(error):
                logger.warning(
                    "Source download rejected on attempt %d/%d; retrying with fresh extraction",
                    attempt,
                    SOURCE_DOWNLOAD_ATTEMPTS,
                )
                await asyncio.sleep(SOURCE_RETRY_DELAY_SECONDS)
                continue
            safe_detail = " ".join(str(error).split())[:300]
            logger.error(
                "Download failed (%s): %s",
                type(error).__name__,
                safe_detail,
            )
            raise MediaDownloadError(classify_download_error(error)) from error

    return None


async def _run_cancellable_command(
    command: list[str],
    *,
    job_id: str,
    timeout_seconds: int,
    stderr_log_path: Path | None = None,
) -> bool:
    err_file = None
    if stderr_log_path is not None:
        err_file = open(stderr_log_path, "wb")
    try:
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=err_file if err_file is not None else asyncio.subprocess.DEVNULL,
        )
        loop = asyncio.get_running_loop()
        started_at = loop.time()
        while process.returncode is None:
            if await asyncio.to_thread(is_job_cancelled, job_id):
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=3)
                except TimeoutError:
                    process.kill()
                    await process.wait()
                raise JobCancelled(f"Job {job_id} was cancelled")
            if loop.time() - started_at > timeout_seconds:
                process.kill()
                await process.wait()
                return False
            try:
                await asyncio.wait_for(process.wait(), timeout=0.5)
            except TimeoutError:
                continue
        return process.returncode == 0
    finally:
        if err_file is not None:
            err_file.close()


async def convert_to_mp3(input_path: Path, output_path: Path, *, job_id: str) -> bool:
    """Convert audio file to MP3 using FFmpeg.

    Args:
        input_path: Input file path
        output_path: Output MP3 file path

    Returns:
        True if conversion succeeded, False otherwise
    """
    logger.info(f"Converting {input_path} to MP3")

    err_log = output_path.parent / f"{output_path.stem}.ffmpeg.log"
    try:
        cmd = [
            str(settings.resolved_ffmpeg_executable),
            "-i",
            str(input_path),
            "-codec:a",
            "libmp3lame",
            "-qscale:a",
            "0",  # VBR ~245kbps — maximum MP3 quality
            "-y",  # Overwrite output file
            str(output_path),
        ]

        success = await _run_cancellable_command(
            cmd,
            job_id=job_id,
            timeout_seconds=300,
            stderr_log_path=err_log,
        )

        if success and output_path.exists():
            logger.info(f"Conversion successful: {output_path}")
            err_log.unlink(missing_ok=True)
            return True
        logger.error("FFmpeg MP3 conversion failed: %s", ffmpeg_error_tail(err_log))
        return False
    except JobCancelled:
        raise
    except Exception as error:
        logger.error("Conversion error: %s", type(error).__name__)
        return False


async def convert_to_mp4(input_path: Path, output_path: Path, *, job_id: str) -> bool:
    """Convert video file to MP4 using FFmpeg.

    Args:
        input_path: Input file path
        output_path: Output MP4 file path

    Returns:
        True if conversion succeeded, False otherwise
    """
    logger.info(f"Converting {input_path} to MP4")

    err_log = output_path.parent / f"{output_path.stem}.ffmpeg.log"
    try:
        cmd = [
            str(settings.resolved_ffmpeg_executable),
            "-i",
            str(input_path),
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-b:a",
            "320k",  # Maximum-quality AAC audio
            "-movflags",
            "+faststart",
            "-y",  # Overwrite output file
            str(output_path),
        ]

        success = await _run_cancellable_command(
            cmd,
            job_id=job_id,
            timeout_seconds=600,
            stderr_log_path=err_log,
        )

        if success and output_path.exists():
            logger.info(f"Conversion successful: {output_path}")
            err_log.unlink(missing_ok=True)
            return True
        logger.error("FFmpeg MP4 conversion failed: %s", ffmpeg_error_tail(err_log))
        return False
    except JobCancelled:
        raise
    except Exception as error:
        logger.error("Conversion error: %s", type(error).__name__)
        return False


async def convert_to_gif(input_path: Path, output_path: Path, *, job_id: str) -> bool:
    """Convert animated media to an optimized, standards-compliant GIF."""
    logger.info(f"Converting {input_path} to GIF")

    err_log = output_path.parent / f"{output_path.stem}.ffmpeg.log"
    try:
        palette_filter = (
            "[0:v]fps=15,scale='min(960,iw)':-2:flags=lanczos,split[s0][s1];"
            "[s0]palettegen=max_colors=256[p];"
            "[s1][p]paletteuse=dither=sierra2_4a"
        )
        cmd = [
            str(settings.resolved_ffmpeg_executable),
            "-i",
            str(input_path),
            "-filter_complex",
            palette_filter,
            "-loop",
            "0",
            "-y",
            str(output_path),
        ]

        success = await _run_cancellable_command(
            cmd,
            job_id=job_id,
            timeout_seconds=600,
            stderr_log_path=err_log,
        )

        if success and output_path.exists():
            logger.info(f"Conversion successful: {output_path}")
            err_log.unlink(missing_ok=True)
            return True
        logger.error("FFmpeg GIF conversion failed: %s", ffmpeg_error_tail(err_log))
        return False
    except JobCancelled:
        raise
    except Exception as error:
        logger.error("Conversion error: %s", type(error).__name__)
        return False


async def _download_validated(
    url: str,
    job_dir: Path,
    format_id: str,
    job_id: str,
    output_format: str,
    selected_has_audio: bool,
    selected_has_video: bool,
) -> Optional[Path]:
    """Download media and verify it opens as real media.

    Retries once with a fresh extraction when the source answers with an
    unusable file (e.g. an HTML error page saved under a media extension).
    Raises MediaDownloadError when no usable file arrives.
    """

    saw_file = False

    async def attempt() -> Optional[Path]:
        nonlocal saw_file
        downloaded = await download_media(
            url,
            job_dir,
            format_id,
            job_id,
            output_format,
            selected_has_audio,
            selected_has_video,
        )
        if downloaded is None:
            return None
        saw_file = True
        if await asyncio.to_thread(is_valid_media, downloaded):
            return downloaded
        logger.warning(
            "Job %s: downloaded file failed media validation, discarding %s",
            job_id,
            downloaded.name,
        )
        downloaded.unlink(missing_ok=True)
        return None

    downloaded_file = await attempt()
    if downloaded_file is not None:
        return downloaded_file
    logger.warning("Job %s: retrying download once after invalid file", job_id)
    downloaded_file = await attempt()
    if downloaded_file is not None:
        return downloaded_file
    if saw_file:
        raise MediaDownloadError("ไฟล์ที่ได้รับจากต้นทางใช้การไม่ได้ กรุณาลองใหม่อีกครั้ง")
    raise MediaDownloadError("ดาวน์โหลดจากแหล่งต้นทางไม่สำเร็จ")


async def process_job(job: dict) -> bool:
    """Process a download job.

    Args:
        job: Job data dictionary

    Returns:
        True if processing succeeded, False otherwise
    """
    job_id = job.get("id")
    url = job.get("original_url")
    format_id = job.get("selected_format_id", "best")
    output_format = job.get("output_format", "mp4")
    selected_has_audio = bool(job.get("selected_has_audio"))
    selected_has_video = job.get("media_type") == "video"

    logger.info(f"Processing job {job_id}: {url} -> {output_format}")

    temp_dir = settings.resolved_temp_dir
    job_dir = temp_dir / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    keep_output = False

    try:
        # Update status to DOWNLOADING
        update_job_status(job_id, "DOWNLOADING")

        # Download media (validated: unusable source files raise)
        if is_job_cancelled(job_id):
            raise JobCancelled(f"Job {job_id} was cancelled")
        try:
            downloaded_file = await _download_validated(
                url,
                job_dir,
                format_id,
                job_id,
                output_format,
                selected_has_audio,
                selected_has_video,
            )
        except MediaDownloadError as error:
            update_job_status(job_id, "FAILED", error_message=str(error))
            return False
        if not downloaded_file:
            update_job_status(
                job_id,
                "FAILED",
                error_message="ดาวน์โหลดจากแหล่งต้นทางไม่สำเร็จ",
            )
            return False

        # Check file size
        file_size_mb = get_file_size_mb(downloaded_file)
        if file_size_mb > settings.max_file_size_mb:
            downloaded_file.unlink()
            update_job_status(
                job_id,
                "FAILED",
                error_message=f"File too large: {file_size_mb:.2f}MB (max: {settings.max_file_size_mb}MB)",
            )
            return False

        # Convert if needed
        output_file: Optional[Path] = None

        if output_format == "mp3":
            if downloaded_file.suffix.lower() == ".mp3":
                output_file = downloaded_file
            else:
                output_file = job_dir / f"{downloaded_file.stem}.mp3"
                success = await convert_to_mp3(
                    downloaded_file,
                    output_file,
                    job_id=job_id,
                )
                if not success:
                    update_job_status(
                        job_id,
                        "FAILED",
                        error_message=(
                            "ไม่พบแทร็กเสียงที่ใช้งานได้ หรือไม่สามารถแปลงเป็น MP3 ได้"
                        ),
                    )
                    return False
                downloaded_file.unlink()
        elif output_format == "mp4":
            if downloaded_file.suffix.lower() == ".mp4":
                output_file = downloaded_file
            else:
                output_file = job_dir / f"{downloaded_file.stem}.mp4"
                success = await convert_to_mp4(
                    downloaded_file,
                    output_file,
                    job_id=job_id,
                )
                if not success:
                    update_job_status(
                        job_id, "FAILED", error_message="MP4 conversion failed"
                    )
                    return False
                downloaded_file.unlink()
        elif output_format == "gif":
            if downloaded_file.suffix.lower() == ".gif":
                output_file = downloaded_file
            else:
                output_file = job_dir / f"{downloaded_file.stem}.gif"
                success = await convert_to_gif(
                    downloaded_file,
                    output_file,
                    job_id=job_id,
                )
                if not success:
                    update_job_status(
                        job_id, "FAILED", error_message="GIF conversion failed"
                    )
                    return False
                downloaded_file.unlink()
        else:
            output_file = downloaded_file

        output_size_mb = get_file_size_mb(output_file)
        if output_size_mb > settings.max_file_size_mb:
            update_job_status(
                job_id,
                "FAILED",
                error_message=(
                    "ไฟล์ผลลัพธ์มีขนาดเกินกำหนดหลังการแปลง: "
                    f"{output_size_mb:.2f}MB (สูงสุด: {settings.max_file_size_mb}MB)"
                ),
            )
            return False

        # Update job with output file info
        if not update_job_status(
            job_id,
            "COMPLETED",
            storage_path=str(output_file),
            file_size=output_file.stat().st_size,
            progress=100,
            completed_at=datetime.now(timezone.utc).isoformat(),
        ):
            raise RuntimeError("Could not persist completed output")

        keep_output = True
        logger.info(f"Job {job_id} completed successfully")
        return True

    except JobCancelled:
        status = get_job_status(job_id)
        if status == "PAUSED":
            logger.info("Stopped paused job %s (keeping temporary files)", job_id)
            keep_output = True
        else:
            logger.info("Stopped cancelled job %s", job_id)
        return False
    except Exception as error:
        logger.error("Error processing job %s: %s", job_id, type(error).__name__)
        if not is_job_cancelled(job_id):
            update_job_status(
                job_id,
                "FAILED",
                error_message="Processing failed",
            )
        return False
    finally:
        if not keep_output:
            shutil.rmtree(job_dir, ignore_errors=True)
