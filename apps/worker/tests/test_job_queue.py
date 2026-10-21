from worker.config import Settings
from worker.job_queue import poll_queued_job, update_job_progress, update_job_status


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeDownloadJobsQuery:
    def __init__(self):
        self.mode = "select"
        self.selected_columns = "*"
        self.filters: list[tuple[str, object]] = []
        self.select_filters: list[tuple[str, object]] = []
        self.update_filters: list[tuple[str, object]] = []
        self.update_data: dict = {}
        self.row = {
            "id": "job-1",
            "status": "QUEUED",
            "locked_by": "pool:local",
            "user_id": "user-1",
            "title": "A test clip",
            "original_url": None,
        }

    def select(self, columns):
        self.mode = "select"
        self.selected_columns = columns
        self.filters = []
        return self

    def update(self, data):
        self.mode = "update"
        self.filters = []
        self.update_data = data
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def order(self, _field, desc=False):
        return self

    def limit(self, _amount):
        return self

    def execute(self):
        if self.mode == "select":
            self.select_filters = list(self.filters)
            if any(self.row.get(field) != value for field, value in self.filters):
                return FakeResult([])
            return FakeResult([dict(self.row)])
        self.update_filters = list(self.filters)
        if any(self.row.get(field) != value for field, value in self.filters):
            return FakeResult([])
        self.row.update(self.update_data)
        return FakeResult([dict(self.row)])


class FakeSupabase:
    def __init__(self):
        self.query = FakeDownloadJobsQuery()

    def table(self, name):
        assert name == "download_jobs"
        return self.query


def test_worker_only_claims_jobs_routed_to_its_pool(monkeypatch):
    database = FakeSupabase()
    settings = Settings(
        worker_id="local-worker-test",
        worker_pool="local",
    )
    monkeypatch.setattr("worker.job_queue.get_supabase_client", lambda: database)
    monkeypatch.setattr("worker.job_queue.get_settings", lambda: settings)

    claimed = poll_queued_job()

    assert claimed["id"] == "job-1"
    assert ("locked_by", "pool:local") in database.query.select_filters
    assert ("locked_by", "pool:local") in database.query.update_filters
    assert database.query.update_data["locked_by"] == "local-worker-test"


def test_progress_update_only_applies_to_an_active_download(monkeypatch):
    database = FakeSupabase()
    database.query.row["status"] = "DOWNLOADING"
    monkeypatch.setattr("worker.job_queue.get_supabase_client", lambda: database)
    monkeypatch.setattr("worker.job_queue.is_job_cancelled", lambda _job_id: False)

    updated = update_job_progress(
        "job-1", 42, download_speed=1024, total_bytes=10485760
    )

    assert updated is True
    assert ("status", "DOWNLOADING") in database.query.update_filters
    assert database.query.update_data["status"] == "DOWNLOADING"
    assert database.query.update_data["progress"] == 42
    assert database.query.update_data["total_bytes_estimate"] == 10485760
    assert "file_size" not in database.query.update_data


def test_terminal_job_transition_sends_one_push_notification(monkeypatch):
    database = FakeSupabase()
    stored_url = "enc:v1:encrypted-original-source"
    database.query.row["original_url"] = stored_url
    notifications = []
    monkeypatch.setattr("worker.job_queue.get_supabase_client", lambda: database)
    monkeypatch.setattr("worker.job_queue.is_job_cancelled", lambda _job_id: False)
    monkeypatch.setattr(
        "worker.job_queue.send_terminal_job_notification",
        lambda **details: notifications.append(details),
    )

    assert update_job_status("job-1", "COMPLETED") is True
    assert update_job_status("job-1", "COMPLETED") is True
    assert database.query.row["original_url"] == stored_url
    assert "original_url" not in database.query.update_data

    assert notifications == [
        {
            "job_id": "job-1",
            "user_id": "user-1",
            "status": "COMPLETED",
            "title": "A test clip",
        }
    ]

    assert update_job_status("job-1", "FAILED") is False
    assert database.query.row["status"] == "COMPLETED"
    assert len(notifications) == 1


def test_stale_terminal_transition_does_not_overwrite_or_notify(monkeypatch):
    database = FakeSupabase()
    database.query.row["status"] = "DOWNLOADING"
    notifications = []

    def simulate_competing_transition(_job_id):
        database.query.row["status"] = "FAILED"
        return False

    monkeypatch.setattr("worker.job_queue.get_supabase_client", lambda: database)
    monkeypatch.setattr(
        "worker.job_queue.is_job_cancelled", simulate_competing_transition
    )
    monkeypatch.setattr(
        "worker.job_queue.send_terminal_job_notification",
        lambda **details: notifications.append(details),
    )

    assert update_job_status("job-1", "COMPLETED") is False
    assert database.query.row["status"] == "FAILED"
    assert notifications == []
