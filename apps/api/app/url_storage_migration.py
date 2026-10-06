"""One-time migration that encrypts stored source URLs and redacts old audits."""

import logging

from app.supabase_client import get_supabase_client
from app.url_storage import (
    UrlStorageError,
    decrypt_url,
    encrypt_url,
    is_encrypted_url,
    safe_url_reference,
)

logger = logging.getLogger("media_loader_api.url_storage_migration")
_BATCH_SIZE = 500


def _validate_encrypted_rows(supabase) -> None:
    """Verify the configured key before changing any legacy rows."""
    offset = 0
    while True:
        result = (
            supabase.table("download_jobs")
            .select("original_url")
            .order("id")
            .range(offset, offset + _BATCH_SIZE - 1)
            .execute()
        )
        rows = result.data or []
        for row in rows:
            stored_url = row.get("original_url")
            if isinstance(stored_url, str) and is_encrypted_url(stored_url):
                try:
                    decrypt_url(stored_url)
                except UrlStorageError as error:
                    raise SystemExit(
                        "The configured key cannot decrypt existing job URLs; "
                        "no rows were changed."
                    ) from error
        if len(rows) < _BATCH_SIZE:
            return
        offset += len(rows)


def _migrate_download_jobs(supabase) -> int:
    migrated = 0
    offset = 0
    while True:
        result = (
            supabase.table("download_jobs")
            .select("id,original_url")
            .order("id")
            .range(offset, offset + _BATCH_SIZE - 1)
            .execute()
        )
        rows = result.data or []
        for row in rows:
            original_url = row.get("original_url")
            if not isinstance(original_url, str):
                continue
            encrypted_url = encrypt_url(original_url)
            if encrypted_url == original_url:
                continue
            update_result = (
                supabase.table("download_jobs")
                .update({"original_url": encrypted_url})
                .eq("id", row["id"])
                .eq("original_url", original_url)
                .execute()
            )
            migrated += len(update_result.data or [])
        if len(rows) < _BATCH_SIZE:
            return migrated
        offset += len(rows)


def _redact_policy_logs(supabase) -> int:
    migrated = 0
    offset = 0
    while True:
        result = (
            supabase.table("policy_logs")
            .select("id,url")
            .order("id")
            .range(offset, offset + _BATCH_SIZE - 1)
            .execute()
        )
        rows = result.data or []
        for row in rows:
            original_url = row.get("url")
            if not isinstance(original_url, str):
                continue
            safe_reference = safe_url_reference(original_url)
            if safe_reference == original_url:
                continue
            update_result = (
                supabase.table("policy_logs")
                .update({"url": safe_reference})
                .eq("id", row["id"])
                .eq("url", original_url)
                .execute()
            )
            migrated += len(update_result.data or [])
        if len(rows) < _BATCH_SIZE:
            return migrated
        offset += len(rows)


def main() -> None:
    """Encrypt legacy job URLs and redact legacy policy-log URLs."""
    try:
        # Validate the shared encryption key before making any database changes.
        encrypt_url("")
    except UrlStorageError as error:
        raise SystemExit("MEDIA_URL_ENCRYPTION_KEY must be configured first") from error

    supabase = get_supabase_client()
    if supabase is None:
        raise SystemExit("Supabase backend credentials must be configured first")

    try:
        _validate_encrypted_rows(supabase)
        encrypted_jobs = _migrate_download_jobs(supabase)
        redacted_logs = _redact_policy_logs(supabase)
    except Exception as error:
        logger.error("URL storage migration failed: %s", type(error).__name__)
        raise SystemExit(
            "URL storage migration failed; see safe server logs"
        ) from error

    print(
        "URL storage migration complete: "
        f"{encrypted_jobs} job URLs encrypted; {redacted_logs} policy-log URLs redacted."
    )


if __name__ == "__main__":
    main()
