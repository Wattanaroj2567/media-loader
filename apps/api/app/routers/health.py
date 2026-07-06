"""Health check endpoint."""

from fastapi import APIRouter

from app.config import get_settings
from app.response import success_response

router = APIRouter(tags=["system"])


@router.get("/health")
async def health_check():
    """Return API health status.

    Used by Docker healthcheck and frontend connection indicator.
    """
    settings = get_settings()
    return success_response(
        data={
            "status": "healthy",
            "worker_id": settings.worker_id,
            "output_mode": settings.media_output_mode,
            "supabase_connected": settings.has_supabase(),
        }
    )
