import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass

from fastapi import Header

from app.config import get_settings
from app.errors import AppError
from app.supabase_client import get_supabase_client


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None = None


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise AppError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบอีกครั้ง")
    scheme, separator, token = authorization.strip().partition(" ")
    if not separator or scheme.lower() != "bearer" or not token.strip():
        raise AppError(401, "INVALID_AUTH", "Session ไม่ถูกต้อง กรุณาเข้าสู่ระบบอีกครั้ง")
    return token.strip()


async def get_current_user(
    authorization: str | None = Header(default=None),
) -> CurrentUser:
    token = extract_bearer_token(authorization)
    supabase = get_supabase_client()
    if not supabase:
        raise AppError(503, "AUTH_UNAVAILABLE", "ระบบยืนยันตัวตนยังไม่พร้อมใช้งาน")
    try:
        response = supabase.auth.get_user(token)
        user = response.user
    except Exception as error:
        raise AppError(
            401, "INVALID_AUTH", "Session หมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง"
        ) from error
    if not user:
        raise AppError(401, "INVALID_AUTH", "Session ไม่ถูกต้อง กรุณาเข้าสู่ระบบอีกครั้ง")
    return CurrentUser(id=str(user.id), email=user.email)


def _get_signing_key() -> str:
    settings = get_settings()
    return settings.supabase_service_role_key or "media-loader-secret-download-key-default"


def generate_download_token(job_id: str, user_id: str, expires_in_seconds: int = 300) -> str:
    """Generate a tamper-proof HMAC-SHA256 signed one-time download token."""
    now = int(time.time())
    payload = {
        "job_id": job_id,
        "user_id": user_id,
        "exp": now + expires_in_seconds,
    }
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode("utf-8").rstrip("=")

    key = _get_signing_key().encode("utf-8")
    sig = hmac.new(key, payload_b64.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode("utf-8").rstrip("=")

    return f"{payload_b64}.{sig_b64}"


def verify_download_token(token: str, expected_job_id: str) -> str:
    """Verify download token and return user_id. Raises AppError if invalid/expired."""
    if not token or "." not in token:
        raise AppError(401, "INVALID_DOWNLOAD_TOKEN", "ลิงก์ดาวน์โหลดไม่ถูกต้องหรือหมดอายุแล้ว")

    payload_b64, _, sig_b64 = token.partition(".")
    key = _get_signing_key().encode("utf-8")
    expected_sig = hmac.new(key, payload_b64.encode("utf-8"), hashlib.sha256).digest()

    padded_sig_b64 = sig_b64 + "=" * (-len(sig_b64) % 4)
    try:
        provided_sig = base64.urlsafe_b64decode(padded_sig_b64)
    except Exception as error:
        raise AppError(401, "INVALID_DOWNLOAD_TOKEN", "ลิงก์ดาวน์โหลดไม่ถูกต้อง") from error

    if not hmac.compare_digest(expected_sig, provided_sig):
        raise AppError(401, "INVALID_DOWNLOAD_TOKEN", "ลิงก์ดาวน์โหลดไม่ถูกต้อง")

    padded_payload_b64 = payload_b64 + "=" * (-len(payload_b64) % 4)
    try:
        payload_data = json.loads(base64.urlsafe_b64decode(padded_payload_b64).decode("utf-8"))
    except Exception as error:
        raise AppError(401, "INVALID_DOWNLOAD_TOKEN", "ลิงก์ดาวน์โหลดไม่ถูกต้อง") from error

    exp = payload_data.get("exp", 0)
    if time.time() > exp:
        raise AppError(401, "DOWNLOAD_TOKEN_EXPIRED", "ลิงก์ดาวน์โหลดหมดอายุแล้ว กรุณากดดาวน์โหลดใหม่อีกครั้ง")

    job_id = payload_data.get("job_id")
    user_id = payload_data.get("user_id")

    if job_id != expected_job_id or not user_id:
        raise AppError(401, "INVALID_DOWNLOAD_TOKEN", "ลิงก์ดาวน์โหลดไม่ถูกต้องสำหรับไฟล์นี้")

    return str(user_id)
