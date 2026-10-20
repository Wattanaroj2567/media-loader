import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app.auth import CurrentUser, get_current_user
from app.config import Settings
from app.main import create_app


def encode_base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def make_public_key(scalar: int) -> bytes:
    return (
        ec.derive_private_key(scalar, ec.SECP256R1())
        .public_key()
        .public_bytes(
            serialization.Encoding.X962,
            serialization.PublicFormat.UncompressedPoint,
        )
    )


PUBLIC_VAPID_KEY = encode_base64url(make_public_key(1))
SUBSCRIPTION_PUBLIC_KEY = encode_base64url(make_public_key(2))
SUBSCRIPTION_AUTH = encode_base64url(b"\x03" * 16)


class FakeResult:
    def __init__(self, data=None):
        self.data = data or []


class FakeQuery:
    def __init__(self):
        self.operation = "select"
        self.filters = []
        self.payload = None
        self.conflict = None

    def upsert(self, payload, on_conflict=None):
        self.operation = "upsert"
        self.payload = payload
        self.conflict = on_conflict
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def execute(self):
        return FakeResult([self.payload] if self.operation == "upsert" else [])


class FakeSupabase:
    def __init__(self):
        self.query = FakeQuery()

    def table(self, name):
        assert name == "push_subscriptions"
        return self.query


def make_client(monkeypatch, database=None, public_key=PUBLIC_VAPID_KEY):
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id="user-123", email="user@example.com"
    )
    monkeypatch.setattr(
        "app.routers.notifications.get_settings",
        lambda: Settings(vapid_public_key=public_key),
    )
    monkeypatch.setattr(
        "app.routers.notifications.get_supabase_client", lambda: database
    )
    return TestClient(app)


def test_push_subscription_is_saved_for_the_authenticated_user(monkeypatch):
    database = FakeSupabase()
    client = make_client(monkeypatch, database)

    response = client.post(
        "/notifications/subscriptions",
        json={
            "endpoint": "https://fcm.googleapis.com/push/subscription-token",
            "keys": {
                "p256dh": SUBSCRIPTION_PUBLIC_KEY,
                "auth": SUBSCRIPTION_AUTH,
            },
            "locale": "th",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"] == {"subscribed": True}
    assert database.query.conflict == "endpoint"
    assert database.query.payload["user_id"] == "user-123"
    assert database.query.payload["p256dh"] == SUBSCRIPTION_PUBLIC_KEY
    assert database.query.payload["auth"] == SUBSCRIPTION_AUTH
    assert database.query.payload["locale"] == "th"
    assert database.query.payload["endpoint"].startswith("https://fcm.googleapis.com/")


def test_push_endpoint_rejects_private_and_untrusted_hosts(monkeypatch):
    database = FakeSupabase()
    client = make_client(monkeypatch, database)

    for endpoint in (
        "http://fcm.googleapis.com/push/token",
        "https://127.0.0.1/push/token",
        "https://fcm.googleapis.com.example.net/push/token",
    ):
        response = client.post(
            "/notifications/subscriptions",
            json={
                "endpoint": endpoint,
                "keys": {
                    "p256dh": SUBSCRIPTION_PUBLIC_KEY,
                    "auth": SUBSCRIPTION_AUTH,
                },
                "locale": "en",
            },
        )
        assert response.status_code == 422

    assert database.query.payload is None


def test_push_subscription_delete_is_scoped_to_the_authenticated_user(monkeypatch):
    database = FakeSupabase()
    client = make_client(monkeypatch, database)

    response = client.request(
        "DELETE",
        "/notifications/subscriptions",
        json={"endpoint": "https://fcm.googleapis.com/push/subscription-token"},
    )

    assert response.status_code == 200
    assert response.json()["data"] == {"deleted": True}
    assert database.query.filters == [
        ("user_id", "user-123"),
        ("endpoint", "https://fcm.googleapis.com/push/subscription-token"),
    ]


def test_public_key_endpoint_reports_unconfigured_push(monkeypatch):
    client = make_client(monkeypatch, public_key="")

    response = client.get("/notifications/vapid-public-key")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "PUSH_NOT_CONFIGURED"


def test_public_key_endpoint_returns_valid_vapid_key(monkeypatch):
    client = make_client(monkeypatch)

    response = client.get("/notifications/vapid-public-key")

    assert response.status_code == 200
    assert response.json()["data"] == {"public_key": PUBLIC_VAPID_KEY}


def test_push_subscription_rejects_invalid_curve_and_auth_keys(monkeypatch):
    database = FakeSupabase()
    client = make_client(monkeypatch, database)

    response = client.post(
        "/notifications/subscriptions",
        json={
            "endpoint": "https://fcm.googleapis.com/push/subscription-token",
            "keys": {"p256dh": "A" * 87, "auth": "B" * 22},
            "locale": "en",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_PUSH_KEYS"
    assert database.query.payload is None


def test_public_key_endpoint_rejects_malformed_vapid_key(monkeypatch):
    client = make_client(monkeypatch, public_key="not-a-vapid-key")

    response = client.get("/notifications/vapid-public-key")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "PUSH_NOT_CONFIGURED"
