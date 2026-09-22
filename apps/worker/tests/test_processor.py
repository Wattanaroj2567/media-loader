import asyncio
import os

import pytest

import worker.processor as processor
from worker.cleanup import cleanup_expired_outputs
from worker.processor import (
    JobCancelled,
    MediaDownloadError,
    _download_validated,
    build_format_selector,
    calculate_download_progress,
    classify_download_error,
    create_progress_hook,
    download_media,
    ffmpeg_error_tail,
    get_file_size_mb,
    is_terminal_status,
    is_valid_media,
)


def test_build_format_selector_uses_selected_real_video_plus_audio():
    # Prefers AAC/m4a audio stream for direct mux without re-encoding
    assert (
        build_format_selector("137", "mp4")
        == "137+bestaudio[ext=m4a]/137+bestaudio/137/best"
    )
    assert build_format_selector("18", "mp4", selected_has_audio=True) == "18/best"
    assert (
        build_format_selector("best", "mp4")
        == "bestvideo+bestaudio[ext=m4a]/bestvideo+bestaudio/best"
    )


def test_build_format_selector_uses_selected_audio_without_video():
    assert build_format_selector("251", "mp3") == "251"
    assert build_format_selector("best", "mp3") == "bestaudio/best"


def test_build_format_selector_uses_audio_stream_for_video_with_audio_mp3():
    assert (
        build_format_selector(
            "18", "mp3", selected_has_audio=True, selected_has_video=True
        )
        == "bestaudio/best"
    )


def test_build_format_selector_preserves_selected_audio_only_format():
    assert build_format_selector("251", "mp3", selected_has_audio=True) == "251"


def test_build_format_selector_uses_video_only_source_for_gif():
    assert build_format_selector("http", "gif", selected_has_video=True) == "http"
    assert (
        build_format_selector("best", "gif", selected_has_video=True)
        == "bestvideo/best"
    )


def test_download_errors_are_classified_without_exposing_extractor_details():
    assert "HTTP 403" in classify_download_error(Exception("HTTP Error 403: Forbidden"))
    assert "JavaScript" in classify_download_error(Exception("No JavaScript runtime"))
    assert "FFmpeg" in classify_download_error(Exception("ffmpeg is not installed"))
    assert classify_download_error(Exception("signed source URL failed")) == (
        "ดาวน์โหลดจากแหล่งต้นทางไม่สำเร็จ"
    )


def test_download_retries_403_with_fresh_extraction(monkeypatch, tmp_path):
    attempts = 0
    captured_options = {}
    downloaded_file = tmp_path / "recovered.mp4"

    class FakeYoutubeDL:
        def __init__(self, options):
            captured_options.update(options)

        def __enter__(self):
            return self

        def __exit__(self, _exc_type, _exc, _traceback):
            return False

        def extract_info(self, _url, *, download):
            nonlocal attempts
            assert download is True
            attempts += 1
            if attempts == 1:
                raise Exception("HTTP Error 403: Forbidden")
            downloaded_file.write_bytes(b"media")
            return {"title": "recovered", "ext": "mp4"}

        def prepare_filename(self, _info):
            return str(downloaded_file)

    async def no_delay(_seconds):
        return None

    monkeypatch.setattr(processor.yt_dlp, "YoutubeDL", FakeYoutubeDL)
    monkeypatch.setattr(processor, "is_job_cancelled", lambda _job_id: False)
    monkeypatch.setattr(processor.asyncio, "sleep", no_delay)

    result = asyncio.run(
        download_media(
            "https://example.com/media",
            tmp_path,
            "137",
            "job-retry",
        )
    )

    assert attempts == 2
    assert result == downloaded_file
    assert captured_options["extractor_args"]["youtube"]["player_client"] == [
        "web_embedded"
    ]


def test_download_media_preserves_direct_giphy_gif(monkeypatch, tmp_path):
    source_url = "https://media.giphy.com/media/example/giphy.gif"
    payload = b"GIF89a" + (b"x" * 32)

    class FakeResponse:
        headers = {
            "Content-Type": "image/gif",
            "Content-Length": str(len(payload)),
        }

        def __init__(self):
            self.offset = 0

        def __enter__(self):
            return self

        def __exit__(self, _exc_type, _exc, _traceback):
            return False

        def geturl(self):
            return "https://media0.giphy.com/media/example/giphy.gif"

        def read(self, size):
            chunk = payload[self.offset : self.offset + size]
            self.offset += len(chunk)
            return chunk

    def fake_urlopen(request, *, timeout):
        assert request.full_url == source_url
        assert request.headers["Accept"].startswith("image/gif")
        assert timeout == 30
        return FakeResponse()

    class UnexpectedYoutubeDL:
        def __init__(self, _options):
            raise AssertionError("direct Giphy GIF must not use the MP4 preview")

    monkeypatch.setattr(processor, "urlopen", fake_urlopen, raising=False)
    monkeypatch.setattr(processor.yt_dlp, "YoutubeDL", UnexpectedYoutubeDL)
    monkeypatch.setattr(processor, "is_job_cancelled", lambda _job_id: False)

    result = asyncio.run(download_media(source_url, tmp_path, "0", "job-giphy", "gif"))

    assert result == tmp_path / "giphy.gif"
    assert result.read_bytes() == payload


def test_calculate_download_progress_handles_exact_estimated_and_missing_totals():
    assert (
        calculate_download_progress({"downloaded_bytes": 50, "total_bytes": 200}) == 25
    )
    assert (
        calculate_download_progress(
            {"downloaded_bytes": 30, "total_bytes_estimate": 100}
        )
        == 30
    )
    assert calculate_download_progress({"downloaded_bytes": 30}) == 0
    assert (
        calculate_download_progress({"downloaded_bytes": 500, "total_bytes": 100}) == 99
    )


def test_get_file_size_mb_uses_actual_file_size(tmp_path):
    output = tmp_path / "output.mp3"
    output.write_bytes(b"x" * (2 * 1024 * 1024))

    assert get_file_size_mb(output) == 2


def test_terminal_status_prevents_worker_overwriting_cancelled_job():
    assert is_terminal_status("CANCELLED") is True
    assert is_terminal_status("COMPLETED") is True
    assert is_terminal_status("FAILED") is True
    assert is_terminal_status("DOWNLOADING") is False


def test_progress_hook_updates_real_percentage_and_stops_cancelled_job():
    updates = []
    hook = create_progress_hook(
        "job-1",
        cancellation_checker=lambda _job_id: False,
        progress_updater=lambda _job_id, progress, _speed, _total: updates.append(
            progress
        ),
    )

    hook({"status": "downloading", "downloaded_bytes": 50, "total_bytes": 100})
    assert updates == [50]

    cancelled_hook = create_progress_hook(
        "job-2",
        cancellation_checker=lambda _job_id: True,
        progress_updater=lambda _job_id, _progress: None,
    )
    with pytest.raises(JobCancelled):
        cancelled_hook(
            {"status": "downloading", "downloaded_bytes": 10, "total_bytes": 100}
        )


def test_cleanup_removes_only_expired_output_and_clears_its_job(tmp_path):
    old_dir = tmp_path / "old-job"
    old_dir.mkdir()
    old_file = old_dir / "old-output.mp4"
    old_file.write_bytes(b"old")

    fresh_dir = tmp_path / "fresh-job"
    fresh_dir.mkdir()
    fresh_file = fresh_dir / "fresh-output.mp4"
    fresh_file.write_bytes(b"fresh")

    now = 10_000.0
    old_time = now - (61 * 60)
    os.utime(old_file, (old_time, old_time))
    os.utime(old_dir, (old_time, old_time))
    os.utime(fresh_file, (now, now))
    os.utime(fresh_dir, (now, now))

    cleared_jobs: list[str] = []
    deleted = cleanup_expired_outputs(
        tmp_path,
        retention_minutes=60,
        now=now,
        output_clearer=cleared_jobs.append,
    )

    assert deleted == 1
    assert not old_dir.exists()
    assert fresh_file.exists()
    assert cleared_jobs == ["old-job"]


def test_failed_job_removes_partial_temp_output(monkeypatch, tmp_path):
    monkeypatch.setattr(processor.settings, "temp_dir", str(tmp_path))
    monkeypatch.setattr(processor, "update_job_status", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(processor, "is_job_cancelled", lambda _job_id: False)

    async def failed_download(
        _url,
        output_path,
        _format_id,
        _job_id,
        _output_format,
        _selected_has_audio,
    ):
        (output_path / "partial.part").write_bytes(b"partial")
        return None

    monkeypatch.setattr(processor, "download_media", failed_download)

    result = asyncio.run(
        processor.process_job(
            {
                "id": "failed-job",
                "original_url": "https://example.com/media",
                "selected_format_id": "137",
                "output_format": "mp4",
            }
        )
    )

    assert result is False
    assert not (tmp_path / "failed-job").exists()


def test_process_job_converts_downloaded_video_to_real_gif(monkeypatch, tmp_path):
    monkeypatch.setattr(processor.settings, "temp_dir", str(tmp_path))
    monkeypatch.setattr(processor, "is_job_cancelled", lambda _job_id: False)
    completed: dict = {}
    commands: list[list[str]] = []

    def capture_status(_job_id, status, **kwargs):
        if status == "COMPLETED":
            completed.update(kwargs)
        return True

    async def fake_download(
        _url,
        output_path,
        _format_id,
        _job_id,
        _output_format,
        _selected_has_audio,
        _selected_has_video,
    ):
        source = output_path / "animated-source.mp4"
        source.write_bytes(b"mp4")
        return source

    async def fake_ffmpeg(command, *, job_id, timeout_seconds, **_kwargs):
        assert job_id == "gif-job"
        assert timeout_seconds == 600
        commands.append(command)
        output = processor.Path(command[-1])
        output.write_bytes(b"GIF89a")
        return True

    monkeypatch.setattr(processor, "update_job_status", capture_status)
    monkeypatch.setattr(processor, "download_media", fake_download)
    # Validation is covered by dedicated tests; this flow focuses on conversion.
    monkeypatch.setattr(processor, "is_valid_media", lambda _path: True)
    monkeypatch.setattr(processor, "_run_cancellable_command", fake_ffmpeg)

    result = asyncio.run(
        processor.process_job(
            {
                "id": "gif-job",
                "original_url": "https://x.com/i/status/2037838931568566363",
                "selected_format_id": "http",
                "output_format": "gif",
                "media_type": "video",
            }
        )
    )

    assert result is True
    assert commands
    assert "palettegen" in " ".join(commands[0])
    assert completed["storage_path"].endswith(".gif")
    assert not (tmp_path / "gif-job" / "animated-source.mp4").exists()


def _make_tiny_mp4(path):
    import subprocess

    ffmpeg = str(processor.settings.resolved_ffmpeg_executable)
    subprocess.run(
        [
            ffmpeg,
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc=duration=0.5:size=64x64:rate=10",
            "-pix_fmt",
            "yuv420p",
            "-y",
            str(path),
        ],
        check=True,
        timeout=60,
    )


def test_is_valid_media_rejects_error_page_saved_as_video(tmp_path):
    garbage = tmp_path / "preview.mp4"
    garbage.write_text("<html><body>Access Denied</body></html>", encoding="utf-8")
    assert is_valid_media(garbage) is False
    assert is_valid_media(tmp_path / "missing.mp4") is False


def test_is_valid_media_accepts_real_media(tmp_path):
    output = tmp_path / "real.mp4"
    try:
        _make_tiny_mp4(output)
    except Exception:
        pytest.skip("FFmpeg unavailable for media generation")
    assert is_valid_media(output) is True


def test_ffmpeg_error_tail_returns_single_line(tmp_path):
    log = tmp_path / "job.ffmpeg.log"
    log.write_bytes(b"[mov @ 0] moov atom not found\nError opening input\n")
    assert ffmpeg_error_tail(log) == "[mov @ 0] moov atom not found Error opening input"
    assert ffmpeg_error_tail(tmp_path / "missing.log") == ""


def test_download_validated_retries_once_after_invalid_file(tmp_path):
    garbage = tmp_path / "garbage.mp4"
    garbage.write_bytes(b"<html>nope</html>")
    calls = {"n": 0}

    async def flaky_download(*_args, **_kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            return garbage
        valid = tmp_path / "valid.mp4"
        try:
            _make_tiny_mp4(valid)
        except Exception:
            pytest.skip("FFmpeg unavailable for media generation")
        return valid

    import worker.processor as processor_module

    original = processor_module.download_media
    processor_module.download_media = flaky_download
    try:
        result = asyncio.run(
            _download_validated(
                "https://example.com/gif",
                tmp_path,
                "0",
                "job-gif",
                "gif",
                False,
                False,
            )
        )
    finally:
        processor_module.download_media = original

    assert calls["n"] == 2
    assert result is not None and result.name == "valid.mp4"
    assert not garbage.exists()


def test_download_validated_rejects_persistently_invalid_file(tmp_path):
    garbage = tmp_path / "garbage.mp4"
    garbage.write_bytes(b"<html>nope</html>")

    async def bad_download(*_args, **_kwargs):
        return garbage

    import worker.processor as processor_module

    original = processor_module.download_media
    processor_module.download_media = bad_download
    try:
        with pytest.raises(MediaDownloadError, match="ใช้การไม่ได้"):
            asyncio.run(
                _download_validated(
                    "https://example.com/gif",
                    tmp_path,
                    "0",
                    "job-gif",
                    "gif",
                    False,
                    False,
                )
            )
    finally:
        processor_module.download_media = original
