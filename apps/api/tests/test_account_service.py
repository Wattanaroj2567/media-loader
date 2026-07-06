from pathlib import Path

from app.account_service import delete_account


class Result:
    def __init__(self, data):
        self.data = data


class Query:
    def __init__(self, rows):
        self.rows = rows
        self.filters = []
        self.payload = None

    def select(self, _columns):
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def update(self, payload):
        self.payload = payload
        return self

    def execute(self):
        matches = [
            row
            for row in self.rows
            if all(row.get(column) == value for column, value in self.filters)
        ]
        if self.payload:
            for row in matches:
                row.update(self.payload)
        return Result([dict(row) for row in matches])


class Admin:
    def __init__(self):
        self.deleted_user = None

    def delete_user(self, user_id):
        self.deleted_user = user_id


class Auth:
    def __init__(self):
        self.admin = Admin()


class FakeSupabase:
    def __init__(self, rows):
        self.rows = rows
        self.auth = Auth()

    def table(self, name):
        assert name == "download_jobs"
        return Query(self.rows)


def test_delete_account_cancels_jobs_cleans_files_and_deletes_auth_user(
    monkeypatch, tmp_path: Path
):
    output_dir = tmp_path / "job-1"
    output_dir.mkdir()
    output = output_dir / "clip.mp4"
    output.write_bytes(b"media")
    rows = [
        {
            "id": "job-1",
            "user_id": "user-1",
            "status": "DOWNLOADING",
            "storage_path": str(output),
        },
        {
            "id": "other-user-job",
            "user_id": "user-2",
            "status": "DOWNLOADING",
            "storage_path": None,
        },
    ]
    database = FakeSupabase(rows)
    monkeypatch.setattr(
        "app.account_service.get_supabase_client", lambda: database
    )

    delete_account("user-1", temp_root=tmp_path)

    assert rows[0]["status"] == "CANCELLED"
    assert rows[1]["status"] == "DOWNLOADING"
    assert output.exists() is False
    assert database.auth.admin.deleted_user == "user-1"
