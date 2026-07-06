"""
Server-side Supabase client using service role key.

This client bypasses RLS and should only be used in trusted backend contexts.
Never expose the service role key to frontend or logs.
"""

from functools import lru_cache

from supabase import create_client, Client

from worker.config import get_settings


@lru_cache
def get_supabase_client() -> Client | None:
    """Create and cache a Supabase client with service role key.

    Returns None if Supabase credentials are not configured.
    """
    settings = get_settings()
    if not settings.has_supabase():
        return None

    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
