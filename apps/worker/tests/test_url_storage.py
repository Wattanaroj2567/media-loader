import pytest
from cryptography.fernet import Fernet

from worker.config import get_settings
from worker.url_storage import (
    UrlStorageError,
    decrypt_url,
    safe_url_reference,
)


def _use_key(monkeypatch, key: str) -> Fernet:
    monkeypatch.setenv("MEDIA_URL_ENCRYPTION_KEY", key)
    get_settings.cache_clear()
    return Fernet(key.encode()) if key else None


@pytest.fixture(autouse=True)
def _reset_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _encrypted(fernet: Fernet, url: str) -> str:
    # Mirrors the API's storage envelope (apps/api/app/url_storage.py).
    return "enc:v1:" + fernet.encrypt(url.encode()).decode()


def test_decrypts_api_ciphertext_and_passes_through_legacy_plaintext(monkeypatch):
    fernet = _use_key(monkeypatch, Fernet.generate_key().decode())
    url = "https://example.com/watch?v=1"

    assert decrypt_url(_encrypted(fernet, url)) == url
    assert decrypt_url(url) == url


def test_decrypt_fails_closed_without_matching_key(monkeypatch):
    fernet = _use_key(monkeypatch, Fernet.generate_key().decode())
    stored = _encrypted(fernet, "https://example.com/secret")

    _use_key(monkeypatch, Fernet.generate_key().decode())
    with pytest.raises(UrlStorageError, match="could not be decrypted"):
        decrypt_url(stored)

    _use_key(monkeypatch, "")
    with pytest.raises(UrlStorageError, match="not configured"):
        decrypt_url(stored)


def test_safe_url_reference_rejects_non_http(monkeypatch):
    assert safe_url_reference("file:///etc/passwd") == "[URL redacted]"
