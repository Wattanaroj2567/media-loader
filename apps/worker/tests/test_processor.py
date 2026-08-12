import asyncio
import os

import pytest

import worker.processor as processor
from worker.cleanup import cleanup_expired_outputs
from worker.processor import (
    JobCancelled,
    build_format_selector,
    calculate_download_progress,
    create_progress_hook,
    is_terminal_status,
)


def test_build_format_selector_uses_selected_real_video_plus_audio():
    # Prefers AAC/m4a audio stream for direct mux without re-encoding
    assert (
        build_format_selector("137", "mp4")
        == "137+bestaudio[ext=m4a]/137+bestaudio/137/best"
    )
    assert (
        build_format_selector("18", "mp4", selected_has_audio=True)
        == "18/best"
    )
    assert (
        build_format_selector("best", "mp4")
        == "bestvideo+bestaudio[ext=m4a]/bestvideo+bestaudio/best"
    )


def test_build_format_selector_uses_selected_audio_without_video():
    assert build_format_selector("251", "mp3") == "251/bestaudio/best"
    assert build_format_selector("best", "mp3") == "bestaudio/best"


def test_calculate_download_progress_handles_exact_estimated_and_missing_totals():
    assert calculate_download_progress(
        {"downloaded_bytes": 50, "total_bytes": 200}
    ) == 25
    assert calculate_download_progress(
        {"downloaded_bytes": 30, "total_bytes_estimate": 100}
    ) == 30
    assert calculate_download_progress({"downloaded_bytes": 30}) == 0
    assert calculate_download_progress(
        {"downloaded_bytes": 500, "total_bytes": 100}
    ) == 99


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
        progress_updater=lambda _job_id, progress, _speed, _total: updates.append(progress),
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
