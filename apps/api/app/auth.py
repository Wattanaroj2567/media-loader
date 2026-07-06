"""Supabase bearer-token authentication for user-owned API operations."""

from dataclasses import dataclass

from fastapi import Header

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
