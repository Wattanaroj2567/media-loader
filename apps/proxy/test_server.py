import asyncio
import socket

import pytest
import server


@pytest.mark.parametrize(
    "address",
    ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"],
)
def test_public_addresses_are_allowed(address):
    assert server._is_public_ip(address) is True


@pytest.mark.parametrize(
    "address",
    [
        "127.0.0.1",
        "10.0.0.5",
        "172.16.0.1",
        "192.168.1.1",
        "169.254.169.254",
        "100.64.0.1",
        "0.0.0.0",
        "::1",
        "fc00::1",
        "fe80::1%eth0",
        "::ffff:127.0.0.1",
        "::ffff:8.8.8.8",
        "64:ff9b::7f00:1",
        "64:ff9b:1::1",
        "2002:7f00:1::1",
        "2001:0::1",
        "not-an-ip",
    ],
)
def test_non_public_addresses_are_rejected(address):
    assert server._is_public_ip(address) is False


def test_parse_authority_normalizes_public_hosts():
    assert server._parse_authority("Example.COM.:443", 443) == ("example.com", 443)
    assert server._parse_authority("example.com", 80) == ("example.com", 80)


@pytest.mark.parametrize(
    ("authority", "default_port"),
    [
        ("example.com:8080", 80),
        ("example.com:80", 443),
        ("example.com:443", 80),
        ("user@example.com", 80),
        ("user:pass@example.com:443", 443),
        ("localhost", 80),
        ("api.localhost:443", 443),
        ("printer.local", 80),
        ("db.internal:443", 443),
        ("intranet", 80),
        ("[::1]:443", 443),
        ("", 80),
    ],
)
def test_parse_authority_rejects_unsafe_destinations(authority, default_port):
    with pytest.raises(server.ProxyRequestError):
        server._parse_authority(authority, default_port)


def _fake_getaddrinfo(*addresses):
    def getaddrinfo(host, port, *_args):
        return [
            (
                socket.AF_INET6 if ":" in address else socket.AF_INET,
                socket.SOCK_STREAM,
                socket.IPPROTO_TCP,
                "",
                (address, port),
            )
            for address in addresses
        ]

    return getaddrinfo


@pytest.mark.parametrize(
    "answers",
    [
        ("127.0.0.1",),
        ("93.184.216.34", "10.0.0.1"),
        ("93.184.216.34", "::1"),
        (),
    ],
)
def test_connect_public_rejects_non_public_or_mixed_dns(monkeypatch, answers):
    monkeypatch.setattr(server.socket, "getaddrinfo", _fake_getaddrinfo(*answers))

    with pytest.raises(server.ProxyRequestError):
        asyncio.run(server._connect_public("rebind.example", 443))


def test_listen_host_defaults_to_loopback(monkeypatch):
    monkeypatch.delenv("PROXY_LISTEN_HOST", raising=False)
    assert server._listen_host() == "127.0.0.1"

    monkeypatch.setenv("PROXY_LISTEN_HOST", "0.0.0.0")
    assert server._listen_host() == "0.0.0.0"


async def _exchange(request: bytes) -> bytes:
    proxy = await asyncio.start_server(server._handle_client, "127.0.0.1", 0)
    port = proxy.sockets[0].getsockname()[1]
    try:
        reader, writer = await asyncio.open_connection("127.0.0.1", port)
        writer.write(request)
        await writer.drain()
        response = await asyncio.wait_for(reader.read(), timeout=5)
        writer.close()
        return response
    finally:
        proxy.close()
        await proxy.wait_closed()


@pytest.mark.parametrize(
    "request_bytes",
    [
        b"CONNECT 127.0.0.1:443 HTTP/1.1\r\nHost: 127.0.0.1:443\r\n\r\n",
        b"CONNECT example.com:22 HTTP/1.1\r\nHost: example.com:22\r\n\r\n",
        b"GET http://127.0.0.1/ HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n",
        b"GET http://169.254.169.254/latest/meta-data HTTP/1.1\r\n\r\n",
        b"GET http://example.com:8080/ HTTP/1.1\r\n\r\n",
        b"GET /relative HTTP/1.1\r\nHost: example.com\r\n\r\n",
        b"GET https://example.com/ HTTP/1.1\r\n\r\n",
        (
            b"POST http://example.com/ HTTP/1.1\r\n"
            b"Content-Length: 1\r\nContent-Length: 2\r\n\r\nab"
        ),
        (
            b"POST http://example.com/ HTTP/1.1\r\n"
            b"Transfer-Encoding: chunked\r\n\r\n0\r\n\r\n"
        ),
    ],
)
def test_unsafe_requests_are_blocked(request_bytes):
    response = asyncio.run(_exchange(request_bytes))
    assert response.startswith(b"HTTP/1.1 403 Destination Blocked")


def test_unsupported_method_is_rejected():
    response = asyncio.run(_exchange(b"TRACE http://example.com/ HTTP/1.1\r\n\r\n"))
    assert response.startswith(b"HTTP/1.1 405")


class _FakeUpstreamWriter:
    def __init__(self):
        self.sent = b""

    def write(self, data):
        self.sent += data

    async def drain(self):
        pass

    def close(self):
        pass

    async def wait_closed(self):
        pass


class _FakeUpstreamReader:
    def __init__(self, header: bytes, chunks: list):
        self._header = header
        self._chunks = list(chunks)

    async def readuntil(self, _separator):
        return self._header

    async def read(self, _size):
        item = self._chunks.pop(0) if self._chunks else b""
        if isinstance(item, Exception):
            raise item
        return item


def _patch_upstream(monkeypatch, header, chunks):
    upstream_writer = _FakeUpstreamWriter()
    calls = []

    async def fake_connect(host, port):
        calls.append((host, port))
        return _FakeUpstreamReader(header, chunks), upstream_writer

    monkeypatch.setattr(server, "_connect_public", fake_connect)
    return upstream_writer, calls


def test_http_forwarding_rewrites_request_and_relays_response(monkeypatch):
    upstream, calls = _patch_upstream(
        monkeypatch,
        b"HTTP/1.1 200 OK\r\nContent-Length: 5\r\nKeep-Alive: timeout=5\r\n\r\n",
        [b"hello"],
    )

    response = asyncio.run(
        _exchange(
            b"GET http://Example.com/path?q=1 HTTP/1.1\r\n"
            b"Host: attacker.invalid\r\n"
            b"Proxy-Authorization: Basic c2VjcmV0\r\n"
            b"Connection: keep-alive\r\n"
            b"User-Agent: test\r\n\r\n"
        )
    )

    assert calls == [("example.com", 80)]
    sent = upstream.sent.decode("latin-1")
    assert sent.startswith("GET /path?q=1 HTTP/1.1\r\n")
    assert "Host: example.com\r\n" in sent
    assert "attacker.invalid" not in sent
    assert "Proxy-Authorization" not in sent
    assert "keep-alive" not in sent.lower()
    assert "User-Agent: test\r\n" in sent
    assert "Connection: close\r\n" in sent

    assert response.startswith(b"HTTP/1.1 200 OK\r\n")
    assert b"Keep-Alive" not in response
    assert b"Connection: close\r\n" in response
    assert response.endswith(b"\r\n\r\nhello")


def test_upstream_failure_mid_body_does_not_append_error_response(monkeypatch):
    _patch_upstream(
        monkeypatch,
        b"HTTP/1.1 200 OK\r\nContent-Length: 10\r\n\r\n",
        [b"part", ConnectionResetError()],
    )

    response = asyncio.run(_exchange(b"GET http://example.com/ HTTP/1.1\r\n\r\n"))

    assert response.startswith(b"HTTP/1.1 200 OK\r\n")
    assert response.endswith(b"part")
    assert b"502" not in response
