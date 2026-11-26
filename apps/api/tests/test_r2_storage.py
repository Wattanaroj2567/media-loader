"""Unit tests for Cloudflare R2 storage helpers and R2-backed file routes."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from botocore.exceptions import ClientError
from fastapi.testclient import TestClient

from app import r2_storage
from app.auth import CurrentUser, get_current_user, get_current_user_optional
from app.errors import AppError
from app.main import app
from app.routers import files as files_router


def test_build_r2_endpoint_url():
    assert (
        r2_storage.build_r2_endpoint_url("acc123")
        == "https://acc123.r2.cloudflarestorage.com"
    )
    assert (
        r2_storage.build_r2_endpoint_url("acc123", "https://custom.r2.example.com/")
        == "https://custom.r2.example.com"
    )
    assert r2_storage.build_r2_endpoint_url("") == ""


def test_build_content_disposition_handles_unicode_and_control_chars():
    header = r2_storage.build_content_disposition('วิดีโอ "ทดสอบ"\r\n.mp4')
    assert header.startswith('attachment; filename="')
    assert "filename*=UTF-8''" in header
    assert "\r" not in header
    assert "\n" not in header


def test_r2_object_exists_returns_false_on_404(monkeypatch):
    fake_client = MagicMock()
    fake_client.head_object.side_effect = ClientError(
        {"Error": {"Code": "404", "Message": "Not Found"}}, "HeadObject"
    )
    monkeypatch.setattr(r2_storage, "get_r2_client", lambda: fake_client)

    assert r2_storage.r2_object_exists("media-downloads", "jobs/1/clip.mp4") is False


def test_generate_r2_download_url_builds_presigned_url(monkeypatch):
    fake_client = MagicMock()
    fake_client.generate_presigned_url.return_value = "https://acc.r2.cloudflarestorage.com/media-downloads/jobs/1/clip.mp4?X-Amz-Signature=abc"
    monkeypatch.setattr(r2_storage, "get_r2_client", lambda: fake_client)

    url = r2_storage.generate_r2_download_url(
        "media-downloads",
        "jobs/1/clip.mp4",
        "clip.mp4",
        expires_in=120,
    )

    assert url.startswith("https://acc.r2.cloudflarestorage.com/")
    fake_client.generate_presigned_url.assert_called_once()
    call_kwargs = fake_client.generate_presigned_url.call_args.kwargs
    assert call_kwargs["Params"]["Bucket"] == "media-downloads"
    assert call_kwargs["Params"]["Key"] == "jobs/1/clip.mp4"
    assert call_kwargs["ExpiresIn"] == 120


def test_generate_r2_download_url_raises_when_unconfigured(monkeypatch):
    monkeypatch.setattr(r2_storage, "get_r2_client", lambda: None)

    with pytest.raises(AppError) as exc:
        r2_storage.generate_r2_download_url(
            "media-downloads", "jobs/1/clip.mp4", "clip.mp4"
        )
    assert exc.value.status_code == 503
    assert exc.value.code == "STORAGE_NOT_CONFIGURED"


def test_files_token_and_download_redirect_for_r2_job(monkeypatch):
    presigned = "https://acc.r2.cloudflarestorage.com/media-downloads/jobs/job-r2/clip.mp4?sig=1"
    fake_job = {
        "id": "job-r2",
        "status": "COMPLETED",
        "title": "Sample Clip",
        "output_format": "mp4",
        "output_bucket": "media-downloads",
        "output_path": "jobs/job-r2/clip.mp4",
    }

    monkeypatch.setattr(files_router, "get_job", lambda *args, **kwargs: fake_job)
    monkeypatch.setattr(files_router, "r2_object_exists", lambda bucket, key: True)
    monkeypatch.setattr(
        files_router,
        "generate_r2_download_url",
        lambda bucket, key, filename, expires_in=None: presigned,
    )
    monkeypatch.setattr(
        files_router,
        "get_settings",
        lambda: SimpleNamespace(r2_presigned_url_ttl_seconds=300),
    )

    user = CurrentUser(id="user-1", email="user@example.com")
    app.dependency_overrides[get_current_user_optional] = lambda: user
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        client = TestClient(app)
        token_resp = client.get("/files/token/job-r2")
        assert token_resp.status_code == 200
        body = token_resp.json()
        assert body["ok"] is True
        assert body["data"]["storage_mode"] == "r2"
        assert body["data"]["download_url"] == presigned

        token = body["data"]["download_token"]
        download_resp = client.get(
            f"/files/download/job-r2?token={token}",
            follow_redirects=False,
        )
        assert download_resp.status_code == 307
        assert download_resp.headers["location"] == presigned
        assert download_resp.headers["cache-control"] == "no-store"
    finally:
        app.dependency_overrides.clear()
