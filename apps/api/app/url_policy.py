"""
URL Policy Engine.

Validates URLs against SSRF rules and platform policies.
Returns a PolicyResult (allowed, blocked, needs_confirmation) along with a reason.
"""

import ipaddress
import socket
from urllib.parse import urlparse

from app.schemas import PolicyResult


def is_private_ip(ip_str: str) -> bool:
    """Treat every non-global IP range as unsafe for user-submitted URLs."""
    try:
        ip = ipaddress.ip_address(ip_str)
        if isinstance(ip, ipaddress.IPv6Address):
            return bool(
                not ip.is_global
                or ip.ipv4_mapped
                or ip.sixtofour
                or ip.teredo
                or ip in ipaddress.ip_network("64:ff9b::/96")
                or ip in ipaddress.ip_network("64:ff9b:1::/48")
            )
        return not ip.is_global
    except ValueError:
        return False


def resolve_and_check_ssrf(hostname: str) -> PolicyResult | None:
    """Resolve hostname and check for private IPs to prevent SSRF."""
    if not hostname:
        return PolicyResult(decision="blocked", reason="Invalid URL: Missing hostname.")

    try:
        # Check if the hostname itself is an IP
        if is_private_ip(hostname):
            return PolicyResult(
                decision="blocked",
                reason=f"Blocked: URL points to a private network address ({hostname}).",
            )

        # Check all address families and reject mixed public/private DNS answers.
        addresses = socket.getaddrinfo(
            hostname,
            None,
            family=socket.AF_UNSPEC,
            type=socket.SOCK_STREAM,
        )
        if not addresses or any(is_private_ip(item[4][0]) for item in addresses):
            return PolicyResult(
                decision="blocked",
                reason="Blocked: Hostname resolves to a non-public network address.",
            )
    except socket.gaierror:
        # Could not resolve — treat as unknown domain requiring confirmation,
        # not as a hard block, since it may be a typo or staging domain.
        return PolicyResult(
            decision="needs_confirmation",
            reason="Hostname could not be resolved. Please verify the URL is correct.",
        )

    return None


def check_url(url: str) -> PolicyResult:
    """Run full policy check on the given URL."""
    if not url or any(char.isspace() or ord(char) < 0x20 for char in url):
        return PolicyResult(decision="blocked", reason="Blocked: Invalid URL format.")
    try:
        parsed = urlparse(url)
    except Exception:
        return PolicyResult(
            decision="blocked", reason="Blocked: URL could not be parsed."
        )

    # 1. Enforce allowed protocols, ports, and reject embedded credentials.
    if parsed.scheme.lower() not in ["http", "https"]:
        return PolicyResult(
            decision="blocked",
            reason=f"Blocked: Unsupported protocol '{parsed.scheme}'. Only HTTP and HTTPS are allowed.",
        )
    try:
        port = parsed.port
    except ValueError:
        return PolicyResult(decision="blocked", reason="Blocked: Invalid URL port.")
    allowed_port = 443 if parsed.scheme.lower() == "https" else 80
    if (
        (port is not None and port != allowed_port)
        or "@" in parsed.netloc
        or parsed.username
        or parsed.password
    ):
        return PolicyResult(
            decision="blocked",
            reason="Blocked: Only standard HTTP/HTTPS ports and URLs without embedded credentials are allowed.",
        )

    hostname = (parsed.hostname or "").rstrip(".").lower()
    if (
        not hostname
        or hostname == "localhost"
        or hostname.endswith((".localhost", ".local", ".internal"))
        or ("." not in hostname and not _is_ip_address(hostname))
    ):
        return PolicyResult(
            decision="blocked",
            reason="Blocked: Internal or invalid hostnames are not allowed.",
        )

    # 2. SSRF Protection (Block private IPs)
    ssrf_result = resolve_and_check_ssrf(hostname)
    if ssrf_result:
        return ssrf_result

    lower_url = url.lower()
    domain = parsed.hostname.lower() if parsed.hostname else ""

    # 3. Block DRM / restricted keywords in domain or path
    restricted_keywords = ["drm", "private", "premium", "protected", "paywall"]
    for keyword in restricted_keywords:
        if keyword in lower_url:
            return PolicyResult(
                decision="blocked",
                reason=f"Blocked: URL contains restricted content indicator ({keyword}).",
            )

    # 4. Whitelist safe platforms (exact suffix match to prevent spoofing)
    safe_platforms = ["archive.org", "wikimedia.org", "wikipedia.org"]
    for platform in safe_platforms:
        if domain == platform or domain.endswith(f".{platform}"):
            return PolicyResult(
                decision="allowed",
                reason=f"Allowed: Trusted open-access platform ({platform}).",
            )

    # 5. Default: require explicit rights confirmation for all other public URLs
    return PolicyResult(
        decision="needs_confirmation",
        reason="URL passed safety checks. Please confirm you have rights to access this content.",
    )


def _is_ip_address(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False
