"""Authenticated Web Push subscription management."""

import base64
import binascii
import re
from typing import Literal
from urllib.parse import urlsplit

from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import CurrentUser, get_current_user
from app.config import get_settings
from app.errors import AppError
from app.response import success_response
from app.supabase_client import get_supabase_client

router = APIRouter(prefix="/notifications", tags=["notifications"])

_BASE64URL = re.compile(r"^[A-Za-z0-9_-]+$")
_EXACT_PUSH_HOSTS = {
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
}
_PUSH_HOST_SUFFIXES = (".push.apple.com", ".notify.windows.com")


class PushKeys(BaseModel):
    p256dh: str = Field(min_length=40, max_length=128)
    auth: str = Field(min_length=16, max_length=64)


class PushSubscriptionRequest(BaseModel):
    endpoint: str = Field(min_length=20, max_length=4096)
    keys: PushKeys
    locale: Literal["th", "en"] = "th"


class DeletePushSubscriptionRequest(BaseModel):
    endpoint: str | None = Field(default=None, min_length=20, max_length=4096)


def _validate_push_endpoint(endpoint: str) -> str:
    try:
        parsed = urlsplit(endpoint)
        host = (parsed.hostname or "").lower().rstrip(".")
        port = parsed.port
    except ValueError as error:
        raise AppError(422, "INVALID_PUSH_ENDPOINT", "ปลายทางแจ้งเตือนไม่ถูกต้อง") from error

    allowed_host = host in _EXACT_PUSH_HOSTS or any(
        host.endswith(suffix) for suffix in _PUSH_HOST_SUFFIXES
    )
    if (
        parsed.scheme != "https"
        or not allowed_host
        or port not in (None, 443)
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
        or not parsed.path
    ):
        raise AppError(422, "INVALID_PUSH_ENDPOINT", "ปลายทางแจ้งเตือนไม่รองรับ")
    return endpoint


def _push_database():
    database = get_supabase_client()
    if not database:
        raise AppError(503, "DB_UNAVAILABLE", "ฐานข้อมูลยังไม่พร้อมใช้งาน")
    return database


def _require_push_public_key() -> str:
    public_key = get_settings().vapid_public_key.strip()
    if not _is_valid_uncompressed_p256_key(public_key):
        raise AppError(
            503,
            "PUSH_NOT_CONFIGURED",
            "ระบบแจ้งเตือนยังไม่ได้ตั้งค่า Web Push",
        )
    return public_key


def _decode_base64url(value: str) -> bytes | None:
    if not _BASE64URL.fullmatch(value):
        return None
    try:
        padded = value + ("=" * (-len(value) % 4))
        return base64.b64decode(padded, altchars=b"-_", validate=True)
    except (ValueError, binascii.Error):
        return None


def _is_valid_uncompressed_p256_key(value: str) -> bool:
    decoded = _decode_base64url(value)
    if decoded is None or len(decoded) != 65 or decoded[0] != 4:
        return False
    try:
        ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), decoded)
        return True
    except ValueError:
        return False


def _is_valid_subscription_keys(p256dh: str, auth: str) -> bool:
    public_key = _decode_base64url(p256dh)
    auth_secret = _decode_base64url(auth)
    return (
        public_key is not None
        and _is_valid_uncompressed_p256_key(p256dh)
        and auth_secret is not None
        and len(auth_secret) == 16
    )


@router.get("/vapid-public-key")
async def get_vapid_public_key(_user: CurrentUser = Depends(get_current_user)):
    """Return the public VAPID key needed to create a browser subscription."""
    return success_response(data={"public_key": _require_push_public_key()})


@router.post("/subscriptions")
async def save_push_subscription(
    request: PushSubscriptionRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create or update one authenticated user's push endpoint."""
    _require_push_public_key()
    if not _is_valid_subscription_keys(request.keys.p256dh, request.keys.auth):
        raise AppError(422, "INVALID_PUSH_KEYS", "กุญแจแจ้งเตือนไม่ถูกต้อง")

    endpoint = _validate_push_endpoint(request.endpoint)
    try:
        _push_database().table("push_subscriptions").upsert(
            {
                "user_id": current_user.id,
                "endpoint": endpoint,
                "p256dh": request.keys.p256dh,
                "auth": request.keys.auth,
                "locale": request.locale,
            },
            on_conflict="endpoint",
        ).execute()
    except AppError:
        raise
    except Exception as error:
        raise AppError(
            500,
            "PUSH_SUBSCRIPTION_SAVE_FAILED",
            "บันทึกการตั้งค่าแจ้งเตือนไม่สำเร็จ",
        ) from error

    return success_response(data={"subscribed": True})


@router.get("/subscriptions/status")
async def get_push_subscription_status(
    current_user: CurrentUser = Depends(get_current_user),
):
    """Report whether the authenticated account has any active push endpoint."""
    try:
        result = (
            _push_database()
            .table("push_subscriptions")
            .select("endpoint")
            .eq("user_id", current_user.id)
            .limit(1)
            .execute()
        )
    except AppError:
        raise
    except Exception as error:
        raise AppError(
            500,
            "PUSH_SUBSCRIPTION_STATUS_FAILED",
            "อ่านการตั้งค่าแจ้งเตือนไม่สำเร็จ",
        ) from error

    return success_response(data={"enabled": bool(result.data)})


@router.delete("/subscriptions")
async def delete_push_subscription(
    request: DeletePushSubscriptionRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Remove one endpoint or all endpoints owned by the authenticated account."""
    try:
        query = (
            _push_database()
            .table("push_subscriptions")
            .delete()
            .eq("user_id", current_user.id)
        )
        if request.endpoint is not None:
            endpoint = _validate_push_endpoint(request.endpoint)
            query = query.eq("endpoint", endpoint)
        query.execute()
    except AppError:
        raise
    except Exception as error:
        raise AppError(
            500,
            "PUSH_SUBSCRIPTION_DELETE_FAILED",
            "ปิดการแจ้งเตือนไม่สำเร็จ",
        ) from error

    return success_response(data={"deleted": True})
