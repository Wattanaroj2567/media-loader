"""Encryption and redaction helpers for user-submitted source URLs."""

from urllib.parse import urlsplit

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings

_ENCRYPTED_URL_PREFIX = "enc:v1:"
_REDACTED_URL = "[URL redacted]"


class UrlStorageError(ValueError):
    """Raised when a source URL cannot be safely encrypted or decrypted."""


def is_encrypted_url(value: str) -> bool:
    """Check whether a stored value uses this module's ciphertext envelope."""
    return value.startswith(_ENCRYPTED_URL_PREFIX)


def _fernet() -> Fernet:
    key = get_settings().media_url_encryption_key.strip()
    if not key:
        raise UrlStorageError("MEDIA_URL_ENCRYPTION_KEY is not configured")
    try:
        return Fernet(key.encode("ascii"))
    except (ValueError, UnicodeEncodeError) as error:
        raise UrlStorageError("MEDIA_URL_ENCRYPTION_KEY is invalid") from error


def encrypt_url(url: str) -> str:
    """Encrypt a URL for database storage, leaving existing ciphertext intact."""
    if is_encrypted_url(url):
        return url
    token = _fernet().encrypt(url.encode("utf-8")).decode("ascii")
    return f"{_ENCRYPTED_URL_PREFIX}{token}"


def decrypt_url(value: str) -> str:
    """Decrypt a stored URL, accepting plaintext rows created by older versions."""
    if not is_encrypted_url(value):
        return value
    try:
        token = value.removeprefix(_ENCRYPTED_URL_PREFIX).encode("ascii")
        return _fernet().decrypt(token).decode("utf-8")
    except (InvalidToken, UnicodeDecodeError, UnicodeEncodeError) as error:
        raise UrlStorageError("Stored source URL could not be decrypted") from error


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
