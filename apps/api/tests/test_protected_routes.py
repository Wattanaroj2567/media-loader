from fastapi.testclient import TestClient

from app.main import create_app


def test_user_owned_routes_require_authentication():
    client = TestClient(create_app())

    responses = [
        client.get("/downloads"),
        client.get("/downloads/not-a-real-job"),
        client.post("/downloads/not-a-real-job/cancel"),
        client.delete("/downloads/not-a-real-job"),
        client.get("/files/download/not-a-real-job"),
        client.delete("/account"),
    ]

    assert [response.status_code for response in responses] == [401] * len(responses)

