from fastapi.testclient import TestClient

from app.auth import CurrentUser, get_current_user
from app.main import create_app
from app.schemas import FormatInfo, MediaMetadata, PolicyResult


def test_user_owned_routes_require_authentication():
    client = TestClient(create_app())

    responses = [
        client.get("/downloads"),
        client.get("/downloads/not-a-real-job"),
        client.post("/downloads/not-a-real-job/cancel"),
        client.delete("/downloads/not-a-real-job"),
        client.get("/files/download/not-a-real-job"),
        client.delete("/account"),
    ]

    assert [response.status_code for response in responses] == [401] * len(responses)


def test_analysis_creation_and_resume_reject_guest_headers_before_processing(
    monkeypatch,
):
    def unexpected(*_args, **_kwargs):
        raise AssertionError("Anonymous requests must not reach processing")

    monkeypatch.setattr("app.routers.media.check_url", unexpected)
    monkeypatch.setattr("app.routers.downloads.check_url", unexpected)
    monkeypatch.setattr("app.routers.downloads.create_job", unexpected)
    monkeypatch.setattr("app.routers.downloads.resume_job", unexpected)
    client = TestClient(create_app())
    for headers in ({}, {"X-Guest-Session-ID": "legacy-guest"}):
        responses = [
            client.post(
                "/media/analyze",
                json={"url": "https://example.com/video"},
                headers=headers,
            ),
            client.post(
                "/downloads",
                json={
                    "url": "https://example.com/video",
                    "selected_format_id": "18",
                    "output_format": "mp4",
                    "rights_confirmed": True,
                },
                headers=headers,
            ),
            client.post("/downloads/legacy-job/resume", headers=headers),
        ]
        for response in responses:
            assert response.status_code == 401
            assert response.json()["error"]["code"] == "AUTH_REQUIRED"


def test_new_jobs_use_verified_account_even_with_guest_header(monkeypatch):
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id="verified-user")
    captured = {}

    async def metadata(_url):
        return MediaMetadata(title="Public clip", platform="Test"), [
            FormatInfo(
                format_id="18",
                type="video",
                extension="mp4",
                quality_label="720p",
                has_audio=True,
                has_video=True,
            )
        ]

    def create_job(**kwargs):
        captured.update(kwargs)
        return "new-account-job"

    monkeypatch.setattr(
        "app.routers.downloads.check_url",
        lambda _url: PolicyResult(decision="allowed", reason="Public source"),
    )
    monkeypatch.setattr("app.routers.downloads.log_decision", lambda *_args: None)
    monkeypatch.setattr("app.routers.downloads.extract_metadata", metadata)
    monkeypatch.setattr("app.routers.downloads.create_job", create_job)
    response = TestClient(app).post(
        "/downloads",
        json={
            "url": "https://example.com/video",
            "selected_format_id": "18",
            "output_format": "mp4",
            "rights_confirmed": True,
        },
        headers={"X-Guest-Session-ID": "untrusted-guest"},
    )
    assert response.status_code == 200
    assert captured["user_id"] == "verified-user"
    assert captured["guest_session_id"] is None
