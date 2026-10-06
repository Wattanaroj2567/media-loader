"""Small forward proxy that only connects to globally routable IP addresses.

DNS answers are validated once and the selected numeric socket address is used
for the connection, so a DNS rebinding change cannot alter the connected peer.
HTTPS is tunneled; clients send each redirected request through the proxy again.
"""

import asyncio
import ipaddress
import os
import socket
from urllib.parse import urlsplit

_LISTEN_PORT = 3128
_HEADER_LIMIT = 64 * 1024
_REQUEST_BODY_LIMIT = 1024 * 1024
_CONNECT_TIMEOUT_SECONDS = 10
_IO_TIMEOUT_SECONDS = 120
_DNS_TIMEOUT_SECONDS = 8
_NAT64_WELL_KNOWN = ipaddress.ip_network("64:ff9b::/96")
_NAT64_LOCAL_USE = ipaddress.ip_network("64:ff9b:1::/48")


class ProxyRequestError(ValueError):
    """Raised when a request is invalid or targets a non-public address."""


def _listen_host() -> str:
    # Loopback keeps a local run from becoming an open proxy for the LAN; the
    # container image opts into 0.0.0.0 and Compose publishes it on loopback.
    return os.environ.get("PROXY_LISTEN_HOST", "").strip() or "127.0.0.1"


def _is_public_ip(value: str) -> bool:
    if "%" in value:
        return False
    try:
        address = ipaddress.ip_address(value)
    except ValueError:
        return False
    if isinstance(address, ipaddress.IPv6Address) and (
        address.ipv4_mapped
        or address.sixtofour
        or address.teredo
        or address in _NAT64_WELL_KNOWN
        or address in _NAT64_LOCAL_USE
    ):
        return False
    return address.is_global


def _parse_authority(authority: str, default_port: int) -> tuple[str, int]:
    try:
        parsed = urlsplit(f"//{authority}")
        host = parsed.hostname
        port = parsed.port if parsed.port is not None else default_port
    except ValueError as error:
        raise ProxyRequestError("Invalid destination") from error
    if (
        not host
        or "@" in authority
        or parsed.username
        or parsed.password
        or parsed.path
        or parsed.query
    ):
        raise ProxyRequestError("Invalid destination")
    if port not in {80, 443}:
        raise ProxyRequestError("Destination port is not allowed")
    if port != default_port:
        raise ProxyRequestError("Destination port does not match scheme")
    normalized_host = host.rstrip(".").lower()
    if (
        not normalized_host
        or normalized_host == "localhost"
        or normalized_host.endswith((".localhost", ".local", ".internal"))
        or ("." not in normalized_host and not _is_public_ip(normalized_host))
    ):
        raise ProxyRequestError("Destination hostname is not public")
    return normalized_host, port


async def _connect_public(
    host: str, port: int
) -> tuple[asyncio.StreamReader, asyncio.StreamWriter]:
    loop = asyncio.get_running_loop()
    try:
        infos = await asyncio.wait_for(
            asyncio.to_thread(
                socket.getaddrinfo,
                host,
                port,
                socket.AF_UNSPEC,
                socket.SOCK_STREAM,
                socket.IPPROTO_TCP,
            ),
            timeout=_DNS_TIMEOUT_SECONDS,
        )
    except (OSError, asyncio.TimeoutError) as error:
        raise ProxyRequestError("Destination could not be resolved") from error
    if not infos or any(not _is_public_ip(info[4][0]) for info in infos):
        raise ProxyRequestError("Destination did not resolve only to public IPs")

    last_error: OSError | None = None
    for family, socktype, proto, _, sockaddr in infos:
        upstream_socket = socket.socket(family, socktype, proto)
        upstream_socket.setblocking(False)
        try:
            await asyncio.wait_for(
                loop.sock_connect(upstream_socket, sockaddr),
                timeout=_CONNECT_TIMEOUT_SECONDS,
            )
            return await asyncio.open_connection(
                sock=upstream_socket, limit=_HEADER_LIMIT
            )
        except (OSError, asyncio.TimeoutError) as error:
            last_error = error if isinstance(error, OSError) else TimeoutError()
            upstream_socket.close()
    raise ProxyRequestError("Destination could not be reached") from last_error


async def _read_header(reader: asyncio.StreamReader) -> bytes:
    try:
        return await asyncio.wait_for(
            reader.readuntil(b"\r\n\r\n"), timeout=_IO_TIMEOUT_SECONDS
        )
    except (
        asyncio.IncompleteReadError,
        asyncio.LimitOverrunError,
        asyncio.TimeoutError,
    ) as error:
        raise ProxyRequestError("Invalid or incomplete HTTP headers") from error


def _parse_headers(raw_lines: list[bytes]) -> list[tuple[str, str]]:
    headers: list[tuple[str, str]] = []
    for raw_line in raw_lines:
        if not raw_line:
            continue
        try:
            name, value = raw_line.decode("latin-1").split(":", 1)
        except ValueError as error:
            raise ProxyRequestError("Malformed HTTP header") from error
        name = name.strip()
        if not name or any(char.isspace() for char in name):
            raise ProxyRequestError("Malformed HTTP header")
        headers.append((name, value.strip()))
    return headers


def _header_values(headers: list[tuple[str, str]], name: str) -> list[str]:
    return [value for key, value in headers if key.lower() == name.lower()]


async def _send_error(writer: asyncio.StreamWriter, status: int, message: str) -> None:
    body = f"{message}\n".encode()
    writer.write(
        f"HTTP/1.1 {status} {message}\r\n".encode("ascii")
        + f"Content-Length: {len(body)}\r\nConnection: close\r\n".encode("ascii")
        + b"Content-Type: text/plain; charset=utf-8\r\n\r\n"
        + body
    )
    await writer.drain()


async def _pipe(
    source: asyncio.StreamReader, destination: asyncio.StreamWriter
) -> None:
    while True:
        try:
            chunk = await asyncio.wait_for(
                source.read(64 * 1024), timeout=_IO_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            break
        if not chunk:
            break
        destination.write(chunk)
        await destination.drain()
    try:
        destination.write_eof()
    except (AttributeError, OSError, RuntimeError):
        pass


async def _tunnel(
    client_reader: asyncio.StreamReader,
    client_writer: asyncio.StreamWriter,
    host: str,
    port: int,
) -> None:
    upstream_reader, upstream_writer = await _connect_public(host, port)
    client_writer.write(b"HTTP/1.1 200 Connection Established\r\n\r\n")
    await client_writer.drain()
    try:
        await asyncio.gather(
            _pipe(client_reader, upstream_writer),
            _pipe(upstream_reader, client_writer),
        )
    finally:
        upstream_writer.close()
        await upstream_writer.wait_closed()


async def _forward_http(
    client_reader: asyncio.StreamReader,
    client_writer: asyncio.StreamWriter,
    method: str,
    target: str,
    version: str,
    headers: list[tuple[str, str]],
) -> None:
    parsed = urlsplit(target)
    if parsed.scheme.lower() != "http" or not parsed.netloc or parsed.fragment:
        raise ProxyRequestError(
            "Only absolute HTTP URLs and HTTPS CONNECT are supported"
        )
    host, port = _parse_authority(parsed.netloc, 80)

    content_lengths = _header_values(headers, "content-length")
    if len(content_lengths) > 1 or _header_values(headers, "transfer-encoding"):
        raise ProxyRequestError("Ambiguous request body framing")
    body = b""
    if content_lengths:
        try:
            body_size = int(content_lengths[0])
        except ValueError as error:
            raise ProxyRequestError("Invalid content length") from error
        if body_size < 0 or body_size > _REQUEST_BODY_LIMIT:
            raise ProxyRequestError("Request body is too large")
        body = await asyncio.wait_for(
            client_reader.readexactly(body_size), timeout=_IO_TIMEOUT_SECONDS
        )

    upstream_reader, upstream_writer = await _connect_public(host, port)
    request_path = parsed.path or "/"
    if parsed.query:
        request_path = f"{request_path}?{parsed.query}"
    host_header = f"[{host}]" if ":" in host else host
    authority = host_header if port == 80 else f"{host_header}:{port}"
    request_lines = [f"{method} {request_path} {version}\r\n"]
    blocked_headers = {
        "connection",
        "keep-alive",
        "proxy-authorization",
        "proxy-connection",
        "transfer-encoding",
        "expect",
    }
    request_lines.extend(
        f"{name}: {value}\r\n"
        for name, value in headers
        if name.lower() not in blocked_headers | {"host"}
    )
    request_lines.extend((f"Host: {authority}\r\n", "Connection: close\r\n", "\r\n"))
    upstream_writer.write("".join(request_lines).encode("latin-1") + body)
    await upstream_writer.drain()

    try:
        response_header = await _read_header(upstream_reader)
        response_lines = response_header.split(b"\r\n")
        status_line = response_lines[0]
        response_headers = _parse_headers(response_lines[1:-2])
        filtered_headers = [
            (name, value)
            for name, value in response_headers
            if name.lower() not in {"connection", "keep-alive", "proxy-connection"}
        ]
        response_bytes = status_line + b"\r\n"
        response_bytes += b"".join(
            f"{name}: {value}\r\n".encode("latin-1") for name, value in filtered_headers
        )
        response_bytes += b"Connection: close\r\n\r\n"
        client_writer.write(response_bytes)
        await client_writer.drain()
        try:
            while chunk := await asyncio.wait_for(
                upstream_reader.read(64 * 1024), timeout=_IO_TIMEOUT_SECONDS
            ):
                client_writer.write(chunk)
                await client_writer.drain()
        except (OSError, asyncio.TimeoutError):
            # The response has started, so an error status can no longer be
            # sent; closing the connection leaves a detectably short body.
            pass
    finally:
        upstream_writer.close()
        await upstream_writer.wait_closed()


async def _handle_client(
    client_reader: asyncio.StreamReader, client_writer: asyncio.StreamWriter
) -> None:
    try:
        raw_header = await _read_header(client_reader)
        lines = raw_header.split(b"\r\n")
        try:
            method, target, version = lines[0].decode("ascii").split(" ", 2)
        except (UnicodeDecodeError, ValueError) as error:
            raise ProxyRequestError("Malformed request line") from error
        if version not in {"HTTP/1.0", "HTTP/1.1"}:
            raise ProxyRequestError("Unsupported HTTP version")
        headers = _parse_headers(lines[1:-2])
        expect = _header_values(headers, "expect")
        if expect and expect[0].lower() == "100-continue":
            client_writer.write(b"HTTP/1.1 100 Continue\r\n\r\n")
            await client_writer.drain()

        if method.upper() == "CONNECT":
            host, port = _parse_authority(target, 443)
            if port != 443:
                raise ProxyRequestError("CONNECT is only allowed on port 443")
            await _tunnel(client_reader, client_writer, host, port)
        elif method.upper() in {
            "GET",
            "HEAD",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        }:
            await _forward_http(
                client_reader,
                client_writer,
                method.upper(),
                target,
                version,
                headers,
            )
        else:
            await _send_error(client_writer, 405, "Method Not Allowed")
    except ProxyRequestError:
        if not client_writer.is_closing():
            await _send_error(client_writer, 403, "Destination Blocked")
    except (OSError, asyncio.TimeoutError, asyncio.IncompleteReadError):
        if not client_writer.is_closing():
            await _send_error(client_writer, 502, "Upstream Request Failed")
    finally:
        client_writer.close()
        try:
            await client_writer.wait_closed()
        except OSError:
            pass


async def main() -> None:
    server = await asyncio.start_server(
        _handle_client,
        host=_listen_host(),
        port=_LISTEN_PORT,
        limit=_HEADER_LIMIT,
        backlog=128,
    )
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
