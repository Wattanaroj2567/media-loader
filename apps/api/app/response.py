"""
Standard API response format for Media Loader.

All endpoints return this shape:
  {"ok": true, "data": {...}, "error": null}
  {"ok": false, "data": null, "error": {"code": "...", "message": "..."}}
"""

from typing import Any

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    """Error detail in API responses."""

    code: str
    message: str


class ApiResponse(BaseModel):
    """Standard API response wrapper."""

    ok: bool
    data: Any | None = None
    error: ErrorDetail | None = None


def success_response(data: Any = None) -> dict:
    """Create a successful API response."""
    return ApiResponse(ok=True, data=data, error=None).model_dump()


def error_response(code: str, message: str) -> dict:
    """Create an error API response."""
    return ApiResponse(
        ok=False,
        data=None,
        error=ErrorDetail(code=code, message=message),
    ).model_dump()
