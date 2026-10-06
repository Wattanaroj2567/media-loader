from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.routers import files

ORIGIN = "http://localhost:3000"
PAYLOAD = bytes(range(256)) * 40  # 10 KiB


@pytest.fixture
def client(monkeypatch, tmp_path):
    output = tmp_path / "job-1" / "clip.mp4"
    output.parent.mkdir()
    output.write_bytes(PAYLOAD)
    monkeypatch.setattr(files, "settings", SimpleNamespace(resolved_temp_dir=tmp_path))
    monkeypatch.setattr(
        files,
        "get_job",
        lambda *_args, **_kwargs: {
            "id": "job-1",
            "status": "COMPLETED",
            "title": "Clip",
            "output_path": str(output),
        },
    )
    return TestClient(create_app())


def _get(client, headers=None):
    return client.get(
        "/files/download/job-1",
        headers={"x-guest-session-id": "guest-1", "Origin": ORIGIN, **(headers or {})},
    )


def test_full_download_advertises_byte_ranges(client):
    response = _get(client)

    assert response.status_code == 200
    assert response.content == PAYLOAD
    assert response.headers["accept-ranges"] == "bytes"


def test_open_ended_range_resumes_from_offset(client):
    response = _get(client, {"Range": "bytes=4096-"})

    assert response.status_code == 206
    assert response.content == PAYLOAD[4096:]
    assert (
        response.headers["content-range"]
        == f"bytes 4096-{len(PAYLOAD) - 1}/{len(PAYLOAD)}"
    )


def test_range_headers_are_readable_by_the_web_app(client):
    response = _get(client, {"Range": "bytes=0-"})

    exposed = {
        value.strip().lower()
        for value in response.headers["access-control-expose-headers"].split(",")
    }
    assert {"content-disposition", "content-range", "content-length"} <= exposed
