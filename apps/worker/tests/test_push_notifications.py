import json
from types import SimpleNamespace

from pywebpush import WebPushException

from worker.config import Settings
from worker.push_notifications import (
    is_allowed_push_endpoint,
    send_terminal_job_notification,
)


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeSubscriptionQuery:
    def __init__(self, rows):
        self.rows = rows
        self.operation = "select"
        self.filters = []

    def select(self, _columns):
        self.operation = "select"
        return self

    def delete(self):
        self.operation = "delete"
        self.filters = []
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def execute(self):
        matches = [
            row
            for row in self.rows
            if all(row.get(field) == value for field, value in self.filters)
        ]
        if self.operation == "delete":
            self.rows[:] = [row for row in self.rows if row not in matches]
            return FakeResult([])
        return FakeResult([dict(row) for row in matches])


class FakeSupabase:
    def __init__(self, subscriptions):
        self.subscriptions = subscriptions
        self.query = FakeSubscriptionQuery(subscriptions)

    def table(self, name):
        assert name == "push_subscriptions"
        return self.query


def test_push_endpoints_are_restricted_to_known_services():
    assert is_allowed_push_endpoint("https://fcm.googleapis.com/push/token")
    assert is_allowed_push_endpoint("https://web.push.apple.com/push/token")
    assert is_allowed_push_endpoint(
        "https://updates.push.services.mozilla.com/wpush/token"
    )
    assert not is_allowed_push_endpoint("http://fcm.googleapis.com/push/token")
    assert not is_allowed_push_endpoint("https://127.0.0.1/push/token")
    assert not is_allowed_push_endpoint(
        "https://fcm.googleapis.com.example.net/push/token"
    )


def test_terminal_notification_uses_the_configured_egress_proxy(monkeypatch):
    rows = [
        {
            "user_id": "user-1",
            "endpoint": "https://fcm.googleapis.com/push/token",
            "p256dh": "public-subscription-key",
            "auth": "subscription-auth-key",
            "locale": "th",
        }
    ]
    database = FakeSupabase(rows)
    settings = Settings(
        vapid_public_key="public-key",
        vapid_private_key="private-key",
        vapid_subject="mailto:push@example.com",
        media_egress_proxy="http://proxy:3128",
    )
    requests = []

    monkeypatch.setattr("worker.push_notifications.get_settings", lambda: settings)
    monkeypatch.setattr(
        "worker.push_notifications.get_supabase_client", lambda: database
    )
    monkeypatch.setattr(
        "worker.push_notifications.webpush",
        lambda **kwargs: requests.append(kwargs),
    )

    send_terminal_job_notification(
        job_id="job-1",
        user_id="user-1",
        status="COMPLETED",
        title="Clip title",
    )

    assert len(requests) == 1
    assert json.loads(requests[0]["data"]) == {
        "title": "ไฟล์พร้อมบันทึก: Clip title",
        "body": "งานจากต้นทางเสร็จแล้ว แตะเพื่อเปิดประวัติและบันทึกลงเครื่อง",
        "tag": "job-job-1",
        "url": "/history?notification=download-ready&job=job-1",
    }
    assert requests[0]["vapid_private_key"] == "private-key"
    assert requests[0]["vapid_claims"] == {"sub": "mailto:push@example.com"}
    assert requests[0]["requests_session"].proxies == {
        "http": "http://proxy:3128",
        "https": "http://proxy:3128",
    }
    assert requests[0]["requests_session"].trust_env is False


def test_gone_push_subscription_is_removed(monkeypatch):
    rows = [
        {
            "user_id": "user-1",
            "endpoint": "https://fcm.googleapis.com/push/expired",
            "p256dh": "public-subscription-key",
            "auth": "subscription-auth-key",
            "locale": "en",
        }
    ]
    database = FakeSupabase(rows)
    settings = Settings(
        vapid_public_key="public-key",
        vapid_private_key="private-key",
        vapid_subject="mailto:push@example.com",
        media_egress_proxy="http://proxy:3128",
    )

    def raise_gone(**_kwargs):
        raise WebPushException("Expired", response=SimpleNamespace(status_code=410))

    monkeypatch.setattr("worker.push_notifications.get_settings", lambda: settings)
    monkeypatch.setattr(
        "worker.push_notifications.get_supabase_client", lambda: database
    )
    monkeypatch.setattr("worker.push_notifications.webpush", raise_gone)

    send_terminal_job_notification(
        job_id="job-1",
        user_id="user-1",
        status="FAILED",
        title="Clip title",
    )

    assert rows == []
