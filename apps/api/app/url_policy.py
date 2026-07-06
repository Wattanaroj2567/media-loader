"""
URL Policy Engine.

Validates URLs against SSRF rules and platform policies.
Returns a PolicyResult (allowed, blocked, needs_confirmation) along with a reason.
"""

import socket
import ipaddress
from urllib.parse import urlparse

from app.schemas import PolicyResult


def is_private_ip(ip_str: str) -> bool:
    """Check if an IP string is a private or loopback address."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_unspecified
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
                reason=f"Blocked: URL points to a private network address ({hostname})."
            )
            
        # Resolve hostname to IP
        ip = socket.gethostbyname(hostname)
        if is_private_ip(ip):
            return PolicyResult(
                decision="blocked",
                reason=f"Blocked: Hostname resolves to a private network address."
            )
    except socket.gaierror:
        # Could not resolve — treat as unknown domain requiring confirmation,
        # not as a hard block, since it may be a typo or staging domain.
        return PolicyResult(
            decision="needs_confirmation",
            reason="Hostname could not be resolved. Please verify the URL is correct."
        )
        
    return None


def check_url(url: str) -> PolicyResult:
    """Run full policy check on the given URL."""
    try:
        parsed = urlparse(url)
    except Exception:
        return PolicyResult(decision="blocked", reason="Blocked: URL could not be parsed.")

    # 1. Enforce allowed protocols
    if parsed.scheme not in ["http", "https"]:
        return PolicyResult(
            decision="blocked",
            reason=f"Blocked: Unsupported protocol '{parsed.scheme}'. Only HTTP and HTTPS are allowed."
        )

    # 2. SSRF Protection (Block private IPs)
    ssrf_result = resolve_and_check_ssrf(parsed.hostname)
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
                reason=f"Blocked: URL contains restricted content indicator ({keyword})."
            )

    # 4. Whitelist safe platforms (exact suffix match to prevent spoofing)
    safe_platforms = ["archive.org", "wikimedia.org", "wikipedia.org"]
    for platform in safe_platforms:
        if domain == platform or domain.endswith(f".{platform}"):
            return PolicyResult(
                decision="allowed",
                reason=f"Allowed: Trusted open-access platform ({platform})."
            )

    # 5. Default: require explicit rights confirmation for all other public URLs
    return PolicyResult(
        decision="needs_confirmation",
        reason="URL passed safety checks. Please confirm you have rights to access this content."
    )
