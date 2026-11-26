"""Unit tests for worker Cloudflare R2 upload and retention cleanup."""

from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

from worker import cleanup, r2_storage


def test_build_r2_endpoint_and_object_key():
    assert (
        r2_storage.build_r2_endpoint_url("acct-xyz")
        == "https://acct-xyz.r2.cloudflarestorage.com"
    )
    assert (
        r2_storage.build_r2_endpoint_url("acct-xyz", "https://r2.local:9000/")
        == "https://r2.local:9000"
    )
    assert (
        r2_storage.build_r2_object_key("job-123", "../nested/video.mp4")
        == "jobs/job-123/video.mp4"
    )


def test_upload_file_to_r2_calls_boto_upload_file(tmp_path: Path, monkeypatch):
    sample = tmp_path / "sample.mp4"
    sample.write_bytes(b"video-bytes")
    fake_client = MagicMock()
    monkeypatch.setattr(r2_storage, "get_r2_client", lambda: fake_client)

    key = r2_storage.upload_file_to_r2(
        sample,
        bucket="media-downloads",
        key="jobs/job-1/sample.mp4",
    )

    assert key == "jobs/job-1/sample.mp4"
    fake_client.upload_file.assert_called_once()
    args = fake_client.upload_file.call_args.args
    assert args[0] == str(sample)
    assert args[1] == "media-downloads"
    assert args[2] == "jobs/job-1/sample.mp4"


def test_cleanup_expired_r2_outputs_deletes_and_clears(monkeypatch):
    rows = [
        {
            "id": "job-old-1",
            "storage_bucket": "media-downloads",
            "storage_path": "jobs/job-old-1/clip.mp4",
        },
        {
            "id": "job-old-2",
            "storage_bucket": "media-downloads",
            "storage_path": "jobs/job-old-2/audio.mp3",
        },
    ]

    class FakeQuery:
        def select(self, *_args, **_kwargs):
            return self

        def eq(self, *_args, **_kwargs):
            return self

        @property
        def not_(self):
            return self

        def is_(self, *_args, **_kwargs):
            return self

        def lt(self, *_args, **_kwargs):
            return self

        def limit(self, *_args, **_kwargs):
            return self

        def execute(self):
            return MagicMock(data=rows)

    class FakeSupabase:
        def table(self, _name):
            return FakeQuery()

    monkeypatch.setattr(cleanup, "get_supabase_client", lambda: FakeSupabase())

    deleted: list[tuple[str | None, str | None]] = []
    cleared: list[str] = []

    count = cleanup.cleanup_expired_r2_outputs(
        60,
        now=datetime(2026, 11, 26, 12, 0, tzinfo=timezone.utc),
        object_deleter=lambda bucket, key: deleted.append((bucket, key)) or True,
        output_clearer=lambda job_id: cleared.append(job_id),
    )

    assert count == 2
    assert deleted == [
        ("media-downloads", "jobs/job-old-1/clip.mp4"),
        ("media-downloads", "jobs/job-old-2/audio.mp3"),
    ]
    assert cleared == ["job-old-1", "job-old-2"]
