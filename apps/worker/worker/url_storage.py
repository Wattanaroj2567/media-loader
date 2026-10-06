"""Encryption and redaction helpers for user-submitted source URLs."""

from urllib.parse import urlsplit

from cryptography.fernet import Fernet, InvalidToken

from worker.config import get_settings

_ENCRYPTED_URL_PREFIX = "enc:v1:"
_REDACTED_URL = "[URL redacted]"


class UrlStorageError(ValueError):
    """Raised when a source URL cannot be safely encrypted or decrypted."""


def _fernet() -> Fernet:
    key = get_settings().media_url_encryption_key.strip()
    if not key:
        raise UrlStorageError("MEDIA_URL_ENCRYPTION_KEY is not configured")
    try:
        return Fernet(key.encode("ascii"))
    except (ValueError, UnicodeEncodeError) as error:
        raise UrlStorageError("MEDIA_URL_ENCRYPTION_KEY is invalid") from error


def decrypt_url(value: str) -> str:
    """Decrypt a stored URL, accepting plaintext rows created by older versions."""
    if not value.startswith(_ENCRYPTED_URL_PREFIX):
        return value
    try:
        token = value.removeprefix(_ENCRYPTED_URL_PREFIX).encode("ascii")
        return _fernet().decrypt(token).decode("utf-8")
    except (InvalidToken, UnicodeDecodeError, UnicodeEncodeError) as error:
        raise UrlStorageError("Stored source URL could not be decrypted") from error


def redact_stored_url(value: str) -> str:
    """Redact a legacy plaintext URL while preserving ciphertext if unavailable."""
    if value.startswith(_ENCRYPTED_URL_PREFIX):
        try:
            return safe_url_reference(decrypt_url(value))
        except UrlStorageError:
            return value
    return safe_url_reference(value)


def safe_url_reference(url: str) -> str:
    """Return an origin-only reference suitable for audit records and logs."""
    try:
        parsed = urlsplit(url)
        hostname = parsed.hostname
        if parsed.scheme.lower() not in {"http", "https"} or not hostname:
            return _REDACTED_URL
        port = parsed.port
    except ValueError:
        return _REDACTED_URL

    host = f"[{hostname}]" if ":" in hostname else hostname
    default_port = 443 if parsed.scheme.lower() == "https" else 80
    authority = f"{host}:{port}" if port and port != default_port else host
    return f"{parsed.scheme.lower()}://{authority}/[redacted]"
