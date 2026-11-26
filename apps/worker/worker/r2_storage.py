"""Cloudflare R2 (S3-compatible) storage operations for Media Loader Worker."""

from __future__ import annotations

import logging
import mimetypes
from functools import lru_cache
from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config

from worker.config import get_settings

logger = logging.getLogger("media_loader_worker.r2_storage")


def build_r2_endpoint_url(account_id: str, endpoint_url: str = "") -> str:
    """Resolve the Cloudflare R2 S3-compatible endpoint URL."""
    explicit = endpoint_url.strip().rstrip("/")
    if explicit:
        return explicit
    clean_account = account_id.strip()
    if clean_account:
        return f"https://{clean_account}.r2.cloudflarestorage.com"
    return ""


def build_r2_object_key(job_id: str, filename: str) -> str:
    """Build a deterministic, safe object key for a completed job output."""
    safe_name = Path(filename).name
    return f"jobs/{job_id}/{safe_name}"


@lru_cache(maxsize=4)
def _cached_r2_client(
    endpoint_url: str,
    access_key_id: str,
    secret_access_key: str,
) -> Any:
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        region_name="auto",
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
        ),
    )


def get_r2_client() -> Any | None:
    """Return a configured boto3 S3 client for Cloudflare R2, or None if unconfigured."""
    settings = get_settings()
    endpoint = build_r2_endpoint_url(settings.r2_account_id, settings.r2_endpoint_url)
    if (
        not endpoint
        or not settings.r2_access_key_id.strip()
        or not settings.r2_secret_access_key.strip()
    ):
        return None
    return _cached_r2_client(
        endpoint,
        settings.r2_access_key_id.strip(),
        settings.r2_secret_access_key.strip(),
    )


def upload_file_to_r2(local_path: Path, *, bucket: str, key: str) -> str:
    """Upload a completed media file to Cloudflare R2 and return its object key."""
    client = get_r2_client()
    if client is None:
        raise RuntimeError("Cloudflare R2 credentials are not configured")
    content_type, _ = mimetypes.guess_type(local_path.name)
    client.upload_file(
        str(local_path),
        bucket,
        key,
        ExtraArgs={"ContentType": content_type or "application/octet-stream"},
    )
    logger.info("Uploaded %s to R2 bucket %s at %s", local_path.name, bucket, key)
    return key


def delete_r2_object(bucket: str | None, key: str | None) -> bool:
    """Delete an object from Cloudflare R2."""
    if not bucket or not key:
        return False
    client = get_r2_client()
    if client is None:
        return False
    try:
        client.delete_object(Bucket=bucket, Key=key)
        return True
    except Exception as error:
        logger.warning("R2 delete_object failed (%s)", type(error).__name__)
        return False
