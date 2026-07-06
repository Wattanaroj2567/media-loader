from pathlib import Path

import pytest

from app.errors import AppError
from app.job_service import cancel_job, delete_job, get_job, list_jobs


class Result:
    def __init__(self, data):
        self.data = data


class InMemoryQuery:
    def __init__(self, database, table_name):
        self.database = database
        self.table_name = table_name
        self.filters = []
        self.operation = "select"
        self.payload = None
        self.range_values = None
        self.order_value = None

    def select(self, _columns):
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def order(self, column, desc=False):
        self.order_value = (column, desc)
        return self

    def range(self, start, end):
        self.range_values = (start, end)
        return self

    def update(self, payload):
        self.operation = "update"
        self.payload = payload
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def execute(self):
        rows = self.database.rows[self.table_name]
        matches = [
            row
            for row in rows
            if all(row.get(column) == value for column, value in self.filters)
        ]
        if self.operation == "update":
            for row in matches:
                row.update(self.payload)
        elif self.operation == "delete":
            self.database.rows[self.table_name] = [
                row for row in rows if row not in matches
            ]
        if self.order_value:
            column, descending = self.order_value
            matches.sort(key=lambda row: row.get(column, ""), reverse=descending)
        if self.range_values:
            start, end = self.range_values
            matches = matches[start : end + 1]
        return Result([dict(row) for row in matches])


class InMemorySupabase:
    def __init__(self, rows):
        self.rows = {"download_jobs": rows}

    def table(self, table_name):
        return InMemoryQuery(self, table_name)


@pytest.fixture
def jobs():
    return [
        {
            "id": "job-u1-active",
            "user_id": "user-1",
            "status": "DOWNLOADING",
            "created_at": "2026-07-05T01:00:00+00:00",
            "storage_path": None,
        },
        {
            "id": "job-u1-done",
            "user_id": "user-1",
            "status": "COMPLETED",
            "created_at": "2026-07-05T02:00:00+00:00",
            "storage_path": None,
        },
        {
            "id": "job-u2",
            "user_id": "user-2",
            "status": "COMPLETED",
            "created_at": "2026-07-05T03:00:00+00:00",
            "storage_path": None,
        },
    ]


def test_list_and_get_jobs_are_always_user_scoped(monkeypatch, jobs):
    database = InMemorySupabase(jobs)
    monkeypatch.setattr("app.job_service.get_supabase_client", lambda: database)

    listed = list_jobs(user_id="user-1", limit=20, offset=0)
    assert [job["id"] for job in listed] == ["job-u1-done", "job-u1-active"]
    assert get_job("job-u2", user_id="user-1") is None
    assert get_job("job-u2", user_id="user-2")["id"] == "job-u2"


def test_history_search_includes_source_domain_and_output_filename(
    monkeypatch,
    jobs,
):
    jobs[1]["source_domain"] = "media.example"
    jobs[1]["storage_path"] = "/tmp/job-u1-done/final-clip.mp4"
    database = InMemorySupabase(jobs)
    monkeypatch.setattr("app.job_service.get_supabase_client", lambda: database)

    by_domain = list_jobs(user_id="user-1", query="media.example")
    by_filename = list_jobs(user_id="user-1", query="final-clip")

    assert [job["id"] for job in by_domain] == ["job-u1-done"]
    assert [job["id"] for job in by_filename] == ["job-u1-done"]


def test_cancel_job_updates_only_a_cancellable_owned_job(monkeypatch, jobs):
    database = InMemorySupabase(jobs)
    monkeypatch.setattr("app.job_service.get_supabase_client", lambda: database)

    cancelled = cancel_job("job-u1-active", user_id="user-1")
    assert cancelled["status"] == "CANCELLED"
    assert get_job("job-u1-active", user_id="user-1")["status"] == "CANCELLED"

    with pytest.raises(AppError) as error:
        cancel_job("job-u1-done", user_id="user-1")
    assert error.value.code == "JOB_NOT_CANCELLABLE"

    with pytest.raises(AppError) as error:
        cancel_job("job-u2", user_id="user-1")
    assert error.value.status_code == 404


def test_delete_job_refuses_running_work_and_cleans_terminal_output(
    monkeypatch, jobs, tmp_path: Path
):
    output_dir = tmp_path / "job-u1-done"
    output_dir.mkdir()
    output = output_dir / "clip.mp4"
    output.write_bytes(b"media")
    jobs[1]["storage_path"] = str(output)

    database = InMemorySupabase(jobs)
    monkeypatch.setattr("app.job_service.get_supabase_client", lambda: database)

    with pytest.raises(AppError) as error:
        delete_job("job-u1-active", user_id="user-1", temp_root=tmp_path)
    assert error.value.code == "JOB_STILL_RUNNING"

    assert (
        delete_job("job-u1-done", user_id="user-1", temp_root=tmp_path) is True
    )
    assert output.exists() is False
    assert get_job("job-u1-done", user_id="user-1") is None
