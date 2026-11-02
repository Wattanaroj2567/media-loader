import asyncio
import io
import json
import sys
from types import SimpleNamespace

import pytest

import worker.processor as processor


@pytest.fixture(autouse=True)
def isolated_resources(monkeypatch):
    monkeypatch.setattr(processor.settings, "max_file_size_mb", 1)
    monkeypatch.setattr(processor, "is_job_cancelled", lambda _job_id: False)
    monkeypatch.setattr(
        processor.shutil, "disk_usage", lambda _path: SimpleNamespace(free=1024**3)
    )


def test_unknown_length_download_is_stopped_by_actual_progress():
    hook = processor.create_progress_hook(
        "oversized-job", cancellation_checker=lambda _job_id: False
    )
    with pytest.raises(processor.MediaDownloadError, match="เกินกำหนด"):
        hook({"status": "downloading", "downloaded_bytes": 1024**2 + 1})


def test_known_oversized_download_is_rejected_before_transferring():
    hook = processor.create_progress_hook(
        "oversized-job", cancellation_checker=lambda _job_id: False
    )
    with pytest.raises(processor.MediaDownloadError):
        hook(
            {"status": "downloading", "downloaded_bytes": 0, "total_bytes": 1024**2 + 1}
        )


def test_job_budget_counts_all_audio_video_and_partial_files(tmp_path):
    for index in range(4):
        with (tmp_path / f"stream-{index}.part").open("wb") as stream:
            stream.truncate(800_000)
    with pytest.raises(processor.MediaDownloadError, match="ชั่วคราว"):
        processor.check_job_resources(tmp_path)


@pytest.mark.parametrize("require_capacity", [False, True])
def test_shared_disk_headroom_is_checked_before_and_during_download(
    monkeypatch, tmp_path, require_capacity
):
    required = processor.MIN_FREE_DISK_BYTES
    if require_capacity:
        required += 3 * 1024**2
    monkeypatch.setattr(
        processor.shutil, "disk_usage", lambda _path: SimpleNamespace(free=required - 1)
    )
    with pytest.raises(processor.MediaDownloadError, match="ไม่เพียงพอ"):
        processor.check_job_resources(tmp_path, require_capacity=require_capacity)


def test_watchdog_stops_external_downloader_and_its_child(monkeypatch, tmp_path):
    processes = []
    create_process = asyncio.create_subprocess_exec

    async def capture_process(*args, **kwargs):
        process = await create_process(*args, **kwargs)
        processes.append(process)
        return process

    monkeypatch.setattr(processor.asyncio, "create_subprocess_exec", capture_process)
    child_code = (
        "import pathlib,time; "
        f"pathlib.Path({str(tmp_path / 'child-ready')!r}).touch(); "
        "time.sleep(1); "
        f"pathlib.Path({str(tmp_path / 'child-survived')!r}).touch()"
    )
    code = (
        "import pathlib,subprocess,sys,time\n"
        f"subprocess.Popen([sys.executable, '-c', {child_code!r}])\n"
        f"while not pathlib.Path({str(tmp_path / 'child-ready')!r}).exists(): time.sleep(0.01)\n"
        f"with open({str(tmp_path / 'unbounded.part')!r}, 'wb') as output: output.truncate(2*1024**2)\n"
        "time.sleep(30)\n"
    )

    async def exercise():
        with pytest.raises(processor.MediaDownloadError):
            await processor._run_cancellable_command(
                [sys.executable, "-c", code],
                job_id="external-job",
                timeout_seconds=10,
                job_dir=tmp_path,
            )
        await asyncio.sleep(1.2)

    asyncio.run(exercise())
    assert (tmp_path / "child-ready").exists()
    assert not (tmp_path / "child-survived").exists()
    assert processes[0].returncode is not None


@pytest.mark.parametrize("cancelled", [False, True])
def test_watchdog_also_reaps_processes_on_timeout_or_cancellation(
    monkeypatch, tmp_path, cancelled
):
    """Timeout and cancellation must both reap the spawned command."""
    monkeypatch.setattr(processor, "is_job_cancelled", lambda _job_id: cancelled)
    processes = []
    create_process = asyncio.create_subprocess_exec

    async def capture_process(*args, **kwargs):
        process = await create_process(*args, **kwargs)
        processes.append(process)
        return process

    monkeypatch.setattr(processor.asyncio, "create_subprocess_exec", capture_process)

    async def exercise():
        command = [sys.executable, "-c", "import time; time.sleep(30)"]
        operation = processor._run_cancellable_command(
            command,
            job_id="stopped-job",
            timeout_seconds=10 if cancelled else 0,
            job_dir=tmp_path,
        )
        if cancelled:
            with pytest.raises(processor.JobCancelled):
                await operation
        else:
            assert await operation is False

    asyncio.run(exercise())
    assert processes
    assert all(process.returncode is not None for process in processes)


def test_download_subprocess_handoff_keeps_source_out_of_command_line(
    monkeypatch, tmp_path
):
    source_url = "https://example.com/public-video"

    async def fake_command(command, *, input_data, job_dir, **_kwargs):
        assert source_url not in " ".join(command)
        assert json.loads(input_data)["url"] == source_url
        assert job_dir == tmp_path
        (tmp_path / "video.mp4").write_bytes(b"media")
        (tmp_path / "download-result.json").write_text(
            json.dumps({"filename": "video.mp4"})
        )
        return True

    monkeypatch.setattr(processor, "_run_cancellable_command", fake_command)
    downloaded = asyncio.run(
        processor.download_media(source_url, tmp_path, "best", "safe-job")
    )
    assert downloaded == tmp_path / "video.mp4"
    assert not (tmp_path / "download-result.json").exists()


def test_download_child_entrypoint_returns_selected_file(monkeypatch, tmp_path):
    monkeypatch.setattr(
        processor.sys,
        "stdin",
        io.StringIO(
            json.dumps(
                {
                    "url": "https://example.com/video",
                    "output_path": str(tmp_path),
                    "format_id": "best",
                    "job_id": "child-job",
                }
            )
        ),
    )
    monkeypatch.setattr(
        processor, "_download_with_yt_dlp", lambda **_kwargs: tmp_path / "video.mp4"
    )
    processor._download_entrypoint()
    assert json.loads((tmp_path / "download-result.json").read_text()) == {
        "filename": "video.mp4"
    }


def test_child_cancellation_preserves_paused_job_output(monkeypatch, tmp_path):
    monkeypatch.setattr(processor.settings, "temp_dir", str(tmp_path))
    monkeypatch.setattr(processor, "get_job_status", lambda _id: "PAUSED")
    monkeypatch.setattr(processor, "update_job_status", lambda *_args, **_kwargs: True)

    def cancelled_download(**_kwargs):
        raise processor.JobCancelled("Paused")

    async def fake_child(_command, *, input_data, job_dir, **_kwargs):
        (job_dir / "source.part").write_bytes(b"partial")
        monkeypatch.setattr(processor.sys, "stdin", io.StringIO(input_data.decode()))
        processor._download_entrypoint()
        return True

    monkeypatch.setattr(processor, "_download_with_yt_dlp", cancelled_download)
    monkeypatch.setattr(processor, "_run_cancellable_command", fake_child)
    assert (
        asyncio.run(
            processor.process_job(
                {
                    "id": "paused-job",
                    "original_url": "https://example.com/video",
                }
            )
        )
        is False
    )
    assert (tmp_path / "paused-job" / "source.part").exists()


def test_resource_failure_cleans_partial_job_files(monkeypatch, tmp_path):
    monkeypatch.setattr(processor.settings, "temp_dir", str(tmp_path))
    statuses = []
    monkeypatch.setattr(
        processor,
        "update_job_status",
        lambda _id, status, **_kwargs: statuses.append(status) or True,
    )

    async def oversized_download(_url, job_dir, *_args):
        (job_dir / "source.part").write_bytes(b"partial")
        raise processor.MediaDownloadError("Resource limit reached")

    monkeypatch.setattr(processor, "download_media", oversized_download)
    assert (
        asyncio.run(
            processor.process_job(
                {
                    "id": "oversized-job",
                    "original_url": "https://example.com/video",
                }
            )
        )
        is False
    )
    assert statuses == ["DOWNLOADING", "FAILED"]
    assert not (tmp_path / "oversized-job").exists()


@pytest.mark.parametrize(
    "convert",
    [processor.convert_to_mp3, processor.convert_to_mp4, processor.convert_to_gif],
)
def test_conversion_preserves_resource_limit_errors(monkeypatch, tmp_path, convert):
    async def oversized_conversion(*_args, **_kwargs):
        raise processor.MediaDownloadError("Resource limit reached")

    monkeypatch.setattr(processor, "_run_cancellable_command", oversized_conversion)
    with pytest.raises(processor.MediaDownloadError):
        asyncio.run(
            convert(
                tmp_path / "source.webm",
                tmp_path / "output.mp4",
                job_id="conversion-job",
            )
        )
