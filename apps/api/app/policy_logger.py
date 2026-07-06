"""
Policy Logger.

Logs URL policy check decisions to the Supabase database for audit purposes.
"""

import logging
from typing import Any

from app.supabase_client import get_supabase_client
from app.schemas import PolicyResult

logger = logging.getLogger("media_loader_api.policy_logger")


def log_decision(url: str, result: PolicyResult, user_id: str) -> None:
    """Log the policy decision to Supabase."""
    supabase = get_supabase_client()
    if not supabase:
        logger.warning("Skipping policy log: Supabase client not configured.")
        return

    from urllib.parse import urlparse
    try:
        parsed = urlparse(url)
        platform = parsed.hostname or "unknown"
    except:
        platform = "unknown"

    log_entry: dict[str, Any] = {
        "url": url,
        "platform": platform,
        "decision": result.decision,
        "reason": result.reason,
        "user_id": user_id,
    }

    try:
        supabase.table("policy_logs").insert(log_entry).execute()
        logger.info(f"Logged policy decision: {result.decision} for {url}")
    except Exception as e:
        logger.error(f"Failed to log policy decision: {e}")
