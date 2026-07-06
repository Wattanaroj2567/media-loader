"""
Custom error handling for Media Loader API.

Provides AppError exception class and a FastAPI exception handler
that converts errors into the standard response format.
"""

from fastapi import Request
from fastapi.responses import JSONResponse

from app.response import error_response


class AppError(Exception):
    """Application-level error with HTTP status code and error code."""

    def __init__(
        self,
        status_code: int = 400,
        code: str = "BAD_REQUEST",
        message: str = "An error occurred",
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    """Handle AppError exceptions and return standard error response."""
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(code=exc.code, message=exc.message),
    )


async def generic_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled exceptions. Never leaks internal details."""
    return JSONResponse(
        status_code=500,
        content=error_response(
            code="INTERNAL_ERROR",
            message="An unexpected error occurred. Please try again later.",
        ),
    )
