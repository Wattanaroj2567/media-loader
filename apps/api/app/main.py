"""
Main FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.errors import AppError, app_error_handler, generic_error_handler
from app.rate_limiter import RateLimiterMiddleware
from app.routers import account, downloads, files, health, media

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
