"""Send job status notifications to verified Web Push subscriptions."""

import json
import logging
from urllib.parse import urlsplit

import requests
from pywebpush import WebPushException, webpush

from worker.config import get_settings
from worker.supabase_client import get_supabase_client

logger = logging.getLogger("media_loader_worker.push_notifications")

TERMINAL_NOTIFICATION_STATUSES = {"COMPLETED", "FAILED", "BLOCKED"}
EXACT_PUSH_HOSTS = {
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
}
PUSH_HOST_SUFFIXES = (".push.apple.com", ".notify.windows.com")

MESSAGES = {
    "th": {
        "COMPLETED": "ดาวน์โหลดสำเร็จแล้ว",
        "FAILED": "ดาวน์โหลดล้มเหลว",
        "BLOCKED": "ดาวน์โหลดถูกบล็อก",
    },
    "en": {
        "COMPLETED": "Download Completed",
        "FAILED": "Download Failed",
        "BLOCKED": "Download Blocked",
    },
}


def is_allowed_push_endpoint(endpoint: str) -> bool:
    """Limit outbound push requests to known public notification services."""
    try:
        parsed = urlsplit(endpoint)
        host = (parsed.hostname or "").lower().rstrip(".")
        port = parsed.port
    except ValueError:
        return False

    return bool(
        parsed.scheme == "https"
        and (
            host in EXACT_PUSH_HOSTS
            or any(host.endswith(s) for s in PUSH_HOST_SUFFIXES)
        )
        and port in (None, 443)
        and parsed.username is None
        and parsed.password is None
        and not parsed.fragment
        and parsed.path
    )


def _remove_subscription(database, user_id: str, endpoint: str) -> None:
    try:
        (
            database.table("push_subscriptions")
            .delete()
            .eq("user_id", user_id)
            .eq("endpoint", endpoint)
            .execute()
        )
    except Exception as error:
        logger.warning(
            "Could not remove expired push subscription: %s", type(error).__name__
        )


def send_terminal_job_notification(
    *,
    job_id: str,
    user_id: str | None,
    status: str,
    title: str | None,
) -> None:
    """Best-effort push delivery; notification failures never fail the job."""
    if not user_id or status not in TERMINAL_NOTIFICATION_STATUSES:
        return

    settings = get_settings()
    if not (
        settings.vapid_public_key.strip()
        and settings.vapid_private_key.strip()
        and settings.vapid_subject.strip()
    ):
        return

    proxy = settings.media_egress_proxy.strip()
    if not proxy:
        logger.warning(
            "Push delivery skipped because the egress proxy is not configured"
        )
        return

    database = get_supabase_client()
    if not database:
        logger.warning("Push delivery skipped because Supabase is unavailable")
        return

    try:
        result = (
            database.table("push_subscriptions")
            .select("endpoint,p256dh,auth,locale")
            .eq("user_id", user_id)
            .execute()
        )
        subscriptions = result.data or []
    except Exception as error:
        logger.warning("Could not read push subscriptions: %s", type(error).__name__)
        return

    if not subscriptions:
        return

    session = requests.Session()
    session.trust_env = False
    session.proxies = {"http": proxy, "https": proxy}
    try:
        for subscription in subscriptions:
            endpoint = subscription.get("endpoint")
            if not isinstance(endpoint, str) or not is_allowed_push_endpoint(endpoint):
                if isinstance(endpoint, str):
                    _remove_subscription(database, user_id, endpoint)
                logger.warning("Skipped a push subscription with an invalid endpoint")
                continue

            locale = subscription.get("locale")
            locale_messages = MESSAGES.get(locale, MESSAGES["en"])
            message = {
                "title": locale_messages[status],
                "body": (title or "Media Loader")
                .replace("\r", " ")
                .replace("\n", " ")[:180],
                "tag": f"job-{job_id}",
                "url": "/dashboard",
            }
            subscription_info = {
                "endpoint": endpoint,
                "keys": {
                    "p256dh": subscription.get("p256dh"),
                    "auth": subscription.get("auth"),
                },
            }

            try:
                webpush(
                    subscription_info=subscription_info,
                    data=json.dumps(message, ensure_ascii=False),
                    vapid_private_key=settings.vapid_private_key,
                    vapid_claims={"sub": settings.vapid_subject},
                    requests_session=session,
                    timeout=(3, 5),
                    ttl=3600,
                )
            except WebPushException as error:
                if error.status_code in {404, 410}:
                    _remove_subscription(database, user_id, endpoint)
                logger.warning(
                    "Push delivery failed with status %s",
                    error.status_code or "unknown",
                )
            except Exception as error:
                logger.warning("Push delivery failed: %s", type(error).__name__)
    finally:
        session.close()
