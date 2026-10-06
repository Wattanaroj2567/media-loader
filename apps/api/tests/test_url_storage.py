import pytest
from cryptography.fernet import Fernet

from app import url_storage_migration
from app.config import get_settings
from app.url_storage import (
    UrlStorageError,
    decrypt_url,
    encrypt_url,
    is_encrypted_url,
    safe_url_reference,
)


def _use_key(monkeypatch, key: str) -> None:
    monkeypatch.setenv("MEDIA_URL_ENCRYPTION_KEY", key)
    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def _reset_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def key(monkeypatch):
    value = Fernet.generate_key().decode()
    _use_key(monkeypatch, value)
    return value


def test_encrypt_round_trip_hides_url(key):
    url = "https://www.youtube.com/watch?v=abc&list=private"
    stored = encrypt_url(url)

    assert is_encrypted_url(stored)
    assert "youtube" not in stored
    assert decrypt_url(stored) == url


def test_encrypt_is_idempotent_and_decrypt_accepts_legacy_plaintext(key):
    stored = encrypt_url("https://example.com/a")
    assert encrypt_url(stored) == stored
    assert decrypt_url("https://example.com/legacy") == "https://example.com/legacy"


def test_missing_or_invalid_key_is_rejected(monkeypatch):
    _use_key(monkeypatch, "")
    with pytest.raises(UrlStorageError, match="not configured"):
        encrypt_url("https://example.com/")

    _use_key(monkeypatch, "not-a-fernet-key")
    with pytest.raises(UrlStorageError, match="invalid"):
        encrypt_url("https://example.com/")


def test_decrypt_with_wrong_key_fails_closed(monkeypatch, key):
    stored = encrypt_url("https://example.com/secret")
    _use_key(monkeypatch, Fernet.generate_key().decode())

    with pytest.raises(UrlStorageError, match="could not be decrypted"):
        decrypt_url(stored)


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://Example.com/watch?v=1#t=2", "https://example.com/[redacted]"),
        ("HTTP://example.com:80/path", "http://example.com/[redacted]"),
        ("https://example.com:8443/path", "https://example.com:8443/[redacted]"),
        ("https://user:pass@example.com/x", "https://example.com/[redacted]"),
        ("http://[2001:db8::1]/x", "http://[2001:db8::1]/[redacted]"),
        ("ftp://example.com/file", "[URL redacted]"),
        ("not a url", "[URL redacted]"),
        ("https://example.com:99999/", "[URL redacted]"),
    ],
)
def test_safe_url_reference_keeps_only_origin(url, expected):
    assert safe_url_reference(url) == expected


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, db, table):
        self.db, self.table = db, table
        self.filters, self.payload, self.window = [], None, None

    def select(self, _columns):
        return self

    def order(self, _column):
        return self

    def range(self, start, end):
        self.window = (start, end)
        return self

    def update(self, payload):
        self.payload = payload
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def execute(self):
        rows = self.db[self.table]
        if self.payload is not None:
            matches = [r for r in rows if all(r.get(c) == v for c, v in self.filters)]
            for row in matches:
                row.update(self.payload)
            return _Result([dict(r) for r in matches])
        start, end = self.window
        return _Result([dict(r) for r in rows[start : end + 1]])


class _FakeSupabase:
    def __init__(self, db):
        self.db = db

    def table(self, name):
        return _Query(self.db, name)


def test_migration_encrypts_jobs_and_redacts_policy_logs(monkeypatch, key):
    already = encrypt_url("https://example.com/already")
    db = {
        "download_jobs": [
            {"id": "1", "original_url": "https://example.com/watch?v=1"},
            {"id": "2", "original_url": already},
        ],
        "policy_logs": [
            {"id": "1", "url": "https://example.com/watch?v=1"},
            {"id": "2", "url": "https://example.com/[redacted]"},
        ],
    }
    monkeypatch.setattr(url_storage_migration, "_BATCH_SIZE", 1)
    monkeypatch.setattr(
        url_storage_migration, "get_supabase_client", lambda: _FakeSupabase(db)
    )

    url_storage_migration.main()

    first_job, second_job = db["download_jobs"]
    assert is_encrypted_url(first_job["original_url"])
    assert decrypt_url(first_job["original_url"]) == "https://example.com/watch?v=1"
    assert second_job["original_url"] == already
    assert [row["url"] for row in db["policy_logs"]] == [
        "https://example.com/[redacted]",
        "https://example.com/[redacted]",
    ]


def test_migration_refuses_to_change_rows_when_key_cannot_decrypt(monkeypatch, key):
    foreign = encrypt_url("https://example.com/foreign")
    _use_key(monkeypatch, Fernet.generate_key().decode())
    db = {
        "download_jobs": [
            {"id": "1", "original_url": "https://example.com/plain"},
            {"id": "2", "original_url": foreign},
        ],
        "policy_logs": [],
    }
    monkeypatch.setattr(
        url_storage_migration, "get_supabase_client", lambda: _FakeSupabase(db)
    )

    with pytest.raises(SystemExit):
        url_storage_migration.main()
    assert db["download_jobs"][0]["original_url"] == "https://example.com/plain"
