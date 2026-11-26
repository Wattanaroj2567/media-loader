"""Cloudflare R2 (S3-compatible) storage operations for Media Loader API."""

from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import Any
from urllib.parse import quote

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import get_settings
from app.errors import AppError

logger = logging.getLogger("media_loader_api.r2_storage")


def build_r2_endpoint_url(account_id: str, endpoint_url: str = "") -> str:
    """Resolve the Cloudflare R2 S3-compatible endpoint URL."""
    explicit = endpoint_url.strip().rstrip("/")
    if explicit:
        return explicit
    clean_account = account_id.strip()
    if clean_account:
        return f"https://{clean_account}.r2.cloudflarestorage.com"
    return ""


def build_content_disposition(filename: str) -> str:
    """Build an ASCII-safe RFC 5987 Content-Disposition attachment header."""
    clean = re.sub(r"[\r\n\"]+", "_", filename).strip() or "download"
    ascii_fallback = (
        clean.encode("ascii", "ignore").decode("ascii").strip(" .") or "download"
    )
    encoded = quote(clean, safe="")
    return f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{encoded}"


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


def r2_object_exists(bucket: str, key: str) -> bool:
    """Return whether an object exists in Cloudflare R2."""
    client = get_r2_client()
    if client is None or not bucket or not key:
        return False
    try:
        client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as error:
        code = str(error.response.get("Error", {}).get("Code", ""))
        if code in {"404", "NoSuchKey", "NotFound"}:
            return False
        logger.warning("R2 head_object failed (%s)", code or type(error).__name__)
        return False
    except Exception as error:
        logger.warning("R2 head_object error (%s)", type(error).__name__)
        return False


def generate_r2_download_url(
    bucket: str,
    key: str,
    filename: str,
    *,
    expires_in: int | None = None,
) -> str:
    """Generate a short-lived presigned GET URL for an R2 object."""
    client = get_r2_client()
    if client is None:
        raise AppError(
            503,
            "STORAGE_NOT_CONFIGURED",
            "ระบบจัดเก็บไฟล์ R2 ยังไม่ได้ตั้งค่า",
        )
    ttl = (
        expires_in
        if expires_in is not None
        else get_settings().r2_presigned_url_ttl_seconds
    )
    return str(
        client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": bucket,
                "Key": key,
                "ResponseContentDisposition": build_content_disposition(filename),
                "ResponseContentType": "application/octet-stream",
            },
            ExpiresIn=max(30, min(ttl, 3600)),
        )
    )


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
