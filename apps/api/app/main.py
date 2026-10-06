"""
Main FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.errors import AppError, app_error_handler, generic_error_handler
from app.rate_limiter import RateLimiterMiddleware
from app.routers import account, downloads, files, health, media

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("media_loader_api")


class AccessTokenRedactionFilter(logging.Filter):
    """Remove all query values from Uvicorn access logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not isinstance(record.args, tuple) or len(record.args) < 3:
            return True

        request_target = record.args[2]
        if not isinstance(request_target, str):
            return True

        redacted_target = (
            f"{request_target.partition('?')[0]}?<redacted>"
            if "?" in request_target
            else request_target
        )
        if redacted_target != request_target:
            args = list(record.args)
            args[2] = redacted_target
            record.args = tuple(args)
        return True


def configure_access_logging() -> None:
    access_logger = logging.getLogger("uvicorn.access")
    existing_filter = next(
        (
            existing
            for existing in access_logger.filters
            if isinstance(existing, AccessTokenRedactionFilter)
        ),
        None,
    )
    redaction_filter = existing_filter or AccessTokenRedactionFilter()
    if existing_filter is None:
        access_logger.addFilter(redaction_filter)
    for handler in access_logger.handlers:
        if not any(
            isinstance(existing, AccessTokenRedactionFilter)
            for existing in handler.filters
        ):
            handler.addFilter(redaction_filter)


configure_access_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the FastAPI app."""
    configure_access_logging()
    settings = get_settings()
    logger.info("Starting Media Loader API...")
    if not settings.has_supabase():
        logger.warning("Supabase credentials not found. DB features will fail.")
    else:
        logger.info("Supabase client initialized.")
        if not settings.media_url_encryption_key.strip():
            logger.error(
                "MEDIA_URL_ENCRYPTION_KEY is not configured; job creation is disabled."
            )

    yield

    logger.info("Shutting down Media Loader API...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Media Loader API",
        description="Backend API for Media Loader",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Configure Rate Limiting Middleware
    app.add_middleware(RateLimiterMiddleware, max_requests=60, window_seconds=60)

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],
        allow_private_network=True,
    )

    # Register Exception Handlers
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, generic_error_handler)

    # Include Routers
    app.include_router(health.router)
    app.include_router(media.router)
    app.include_router(downloads.router)
    app.include_router(files.router)
    app.include_router(account.router)

    return app


app = create_app()
