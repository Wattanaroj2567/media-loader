from worker.config import Settings
from worker.job_queue import poll_queued_job, update_job_progress


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeDownloadJobsQuery:
    def __init__(self):
        self.mode = "select"
        self.filters: list[tuple[str, object]] = []
        self.select_filters: list[tuple[str, object]] = []
        self.update_filters: list[tuple[str, object]] = []
        self.update_data: dict = {}

    def select(self, _columns):
        self.mode = "select"
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
            return FakeResult(
                [{"id": "job-1", "status": "QUEUED", "locked_by": "pool:local"}]
            )
        self.update_filters = list(self.filters)
        return FakeResult(
            [
                {
                    "id": "job-1",
                    "status": self.update_data["status"],
                    "locked_by": self.update_data.get("locked_by"),
                }
            ]
        )


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
        railway_environment_id="",
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
