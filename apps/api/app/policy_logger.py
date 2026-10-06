"""
Policy Logger.

Logs URL policy check decisions to the Supabase database for audit purposes.
"""

import logging
from typing import Any

from app.schemas import PolicyResult
from app.supabase_client import get_supabase_client
from app.url_storage import safe_url_reference

logger = logging.getLogger("media_loader_api.policy_logger")


def log_decision(url: str, result: PolicyResult, user_id: str) -> None:
    """Log the policy decision to Supabase."""
    supabase = get_supabase_client()
    if not supabase:
        logger.warning("Skipping policy log: Supabase client not configured.")
        return

    from urllib.parse import urlsplit

    try:
        platform = urlsplit(url).hostname or "unknown"
    except Exception:
        platform = "unknown"

    log_entry: dict[str, Any] = {
        "url": safe_url_reference(url),
        "platform": platform,
        "decision": result.decision,
        "reason": result.reason,
        "user_id": user_id,
    }

    try:
        supabase.table("policy_logs").insert(log_entry).execute()
        logger.info("Logged policy decision: %s for %s", result.decision, platform)
    except Exception as error:
        logger.error("Failed to log policy decision: %s", type(error).__name__)
