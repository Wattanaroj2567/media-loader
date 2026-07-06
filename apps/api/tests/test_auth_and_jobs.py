import pytest

from app.auth import extract_bearer_token
from app.errors import AppError
from app.job_service import (
    can_cancel_job,
    can_delete_job,
    create_job,
)


class FakeResult:
    def __init__(self, data=None):
        self.data = data or []


class InsertTable:
    def __init__(self):
        self.inserted = None

    def insert(self, data):
        self.inserted = data
        return self

    def execute(self):
        return FakeResult([self.inserted])


class FakeSupabase:
    def __init__(self):
        self.download_jobs = InsertTable()
        self.tables_requested = []

    def table(self, name):
        self.tables_requested.append(name)
        if name != "download_jobs":
            raise AssertionError(f"Unexpected table lookup: {name}")
        return self.download_jobs


def test_extract_bearer_token_requires_a_valid_bearer_header():
    assert extract_bearer_token("Bearer abc.def.ghi") == "abc.def.ghi"

    for header in (None, "", "Basic abc", "Bearer", "Bearer  "):
        with pytest.raises(AppError) as error:
            extract_bearer_token(header)
        assert error.value.status_code == 401


def test_job_transition_rules_distinguish_cancel_from_delete():
    assert can_cancel_job("QUEUED") is True
    assert can_cancel_job("DOWNLOADING") is True
    assert can_cancel_job("CONVERTING") is True
    assert can_cancel_job("COMPLETED") is False

    assert can_delete_job("QUEUED") is True
    assert can_delete_job("COMPLETED") is True
    assert can_delete_job("FAILED") is True
    assert can_delete_job("DOWNLOADING") is False


def test_create_job_requires_user_and_persists_analysis_metadata(monkeypatch):
    fake = FakeSupabase()
    monkeypatch.setattr("app.job_service.get_supabase_client", lambda: fake)

    job_id = create_job(
        user_id="user-123",
        url="https://example.com/watch/1",
        format_id="137",
        output_format="mp4",
        title="A real clip",
        platform="Youtube",
        uploader="Clip Owner",
        source_domain="example.com",
        thumbnail_url="https://img.example/clip.jpg",
        duration_seconds=125,
        media_type="video",
        selected_quality="1080p · 30 FPS",
        selected_has_audio=False,
    )

    assert job_id
    assert fake.tables_requested == ["download_jobs"]
    assert fake.download_jobs.inserted["user_id"] == "user-123"
    assert fake.download_jobs.inserted["title"] == "A real clip"
    assert fake.download_jobs.inserted["uploader"] == "Clip Owner"
    assert fake.download_jobs.inserted["selected_quality"] == "1080p · 30 FPS"
    assert fake.download_jobs.inserted["selected_has_audio"] is False
