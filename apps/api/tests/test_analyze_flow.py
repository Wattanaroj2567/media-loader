import asyncio

import pytest

from app.auth import CurrentUser
from app.errors import AppError
from app.routers.downloads import create_download_job_endpoint
from app.routers.media import analyze_media
from app.schemas import (
    AnalyzeRequest,
    DownloadRequest,
    FormatInfo,
    MediaMetadata,
    PolicyResult,
)


def test_analysis_checks_policy_before_extraction_without_rights_confirmation(
    monkeypatch,
):
    calls: list[str] = []

    def fake_check_url(_url: str) -> PolicyResult:
        calls.append("policy")
        return PolicyResult(decision="allowed", reason="Public source")

    async def fake_extract_metadata(_url: str):
        calls.append("analysis")
        return MediaMetadata(title="Public clip", platform="Test"), []

    monkeypatch.setattr("app.routers.media.check_url", fake_check_url)
    monkeypatch.setattr("app.routers.media.log_decision", lambda *_args: None)
    monkeypatch.setattr(
        "app.routers.media.extract_metadata",
        fake_extract_metadata,
    )

    response = asyncio.run(
        analyze_media(
            AnalyzeRequest(url="https://example.com/watch/1"),
            CurrentUser(id="user-1"),
        )
    )

    assert response["ok"] is True
    assert response["data"]["media"]["title"] == "Public clip"
    assert calls == ["policy", "analysis"]


def test_queue_creation_rechecks_policy_and_real_format_before_insert(monkeypatch):
    calls: list[str] = []
    captured: dict = {}

    def fake_check_url(_url: str) -> PolicyResult:
        calls.append("policy")
        return PolicyResult(decision="allowed", reason="Public source")

    async def fake_extract_metadata(_url: str):
        calls.append("analysis")
        return (
            MediaMetadata(title="Combined clip", platform="Test"),
            [
                FormatInfo(
                    format_id="18",
                    type="video",
                    extension="mp4",
                    quality_label="360p",
                    height=360,
                    has_video=True,
                    has_audio=True,
                )
            ],
        )

    def fake_create_job(**kwargs):
        calls.append("queue")
        captured.update(kwargs)
        return "job-1"

    monkeypatch.setattr("app.routers.downloads.check_url", fake_check_url)
    monkeypatch.setattr("app.routers.downloads.log_decision", lambda *_args: None)
    monkeypatch.setattr(
        "app.routers.downloads.extract_metadata",
        fake_extract_metadata,
    )
    monkeypatch.setattr("app.routers.downloads.create_job", fake_create_job)

    response = asyncio.run(
        create_download_job_endpoint(
            DownloadRequest(
                url="https://example.com/watch/1",
                selected_format_id="18",
                output_format="mp4",
                rights_confirmed=True,
            ),
            CurrentUser(id="user-1"),
        )
    )

    assert response["data"] == {"job_id": "job-1", "status": "QUEUED"}
    assert calls == ["policy", "analysis", "queue"]
    assert captured["selected_has_audio"] is True
    assert captured["rights_confirmed"] is True


def test_create_download_job_requires_rights_confirmation():
    with pytest.raises(AppError) as exc_info:
        asyncio.run(
            create_download_job_endpoint(
                DownloadRequest(
                    url="https://example.com/watch/1",
                    selected_format_id="18",
                    output_format="mp4",
                    rights_confirmed=False,
                ),
                CurrentUser(id="user-1"),
            )
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.code == "RIGHTS_NOT_CONFIRMED"


def test_queue_creation_accepts_gif_output_for_video_source(monkeypatch):
    captured: dict = {}

    async def fake_extract_metadata(_url: str):
        return (
            MediaMetadata(
                title="Animated post",
                platform="Twitter",
                is_animated_gif=True,
            ),
            [
                FormatInfo(
                    format_id="http",
                    type="video",
                    extension="mp4",
                    quality_label="Original video",
                    has_video=True,
                    has_audio=False,
                )
            ],
        )

    def fake_create_job(**kwargs):
        captured.update(kwargs)
        return "gif-job"

    monkeypatch.setattr(
        "app.routers.downloads.check_url",
        lambda _url: PolicyResult(decision="allowed", reason="Public source"),
    )
    monkeypatch.setattr("app.routers.downloads.log_decision", lambda *_args: None)
    monkeypatch.setattr("app.routers.downloads.extract_metadata", fake_extract_metadata)
    monkeypatch.setattr("app.routers.downloads.create_job", fake_create_job)

    response = asyncio.run(
        create_download_job_endpoint(
            DownloadRequest(
                url="https://x.com/i/status/2037838931568566363",
                selected_format_id="http",
                output_format="gif",
                rights_confirmed=True,
            ),
            CurrentUser(id="user-1"),
        )
    )

    assert response["data"] == {"job_id": "gif-job", "status": "QUEUED"}
    assert captured["output_format"] == "gif"
    assert captured["media_type"] == "video"


def test_queue_creation_rejects_gif_output_for_normal_video(monkeypatch):
    async def fake_extract_metadata(_url: str):
        return (
            MediaMetadata(
                title="Normal video",
                platform="Twitter",
                is_animated_gif=False,
            ),
            [
                FormatInfo(
                    format_id="video",
                    type="video",
                    extension="mp4",
                    quality_label="720p",
                    has_video=True,
                    has_audio=True,
                )
            ],
        )

    monkeypatch.setattr(
        "app.routers.downloads.check_url",
        lambda _url: PolicyResult(decision="allowed", reason="Public source"),
    )
    monkeypatch.setattr("app.routers.downloads.log_decision", lambda *_args: None)
    monkeypatch.setattr("app.routers.downloads.extract_metadata", fake_extract_metadata)

    with pytest.raises(AppError) as exc_info:
        asyncio.run(
            create_download_job_endpoint(
                DownloadRequest(
                    url="https://x.com/i/status/normal-video",
                    selected_format_id="video",
                    output_format="gif",
                    rights_confirmed=True,
                ),
                CurrentUser(id="user-1"),
            )
        )

    assert exc_info.value.code == "FORMAT_TYPE_MISMATCH"
