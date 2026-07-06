import pytest
from app.url_policy import is_private_ip, check_url

def test_is_private_ip():
    # Loopback
    assert is_private_ip("127.0.0.1") is True
    assert is_private_ip("::1") is True
    
    # Private IPv4 classes
    assert is_private_ip("10.0.0.1") is True
    assert is_private_ip("172.16.0.1") is True
    assert is_private_ip("192.168.1.1") is True
    
    # Public IPs
    assert is_private_ip("8.8.8.8") is False
    assert is_private_ip("142.250.190.46") is False
    
    # Invalid IPs
    assert is_private_ip("invalid_ip") is False
    assert is_private_ip("999.999.999.999") is False

def test_check_url_protocols():
    # Supported public URLs still require explicit rights confirmation.
    res = check_url("http://example.com")
    assert res.decision == "needs_confirmation"
    
    res = check_url("https://example.com")
    assert res.decision == "needs_confirmation"
    
    # Unsupported protocol
    res = check_url("ftp://example.com")
    assert res.decision == "blocked"
    assert "Unsupported protocol" in res.reason
    
    res = check_url("file:///etc/passwd")
    assert res.decision == "blocked"
    assert "Unsupported protocol" in res.reason

def test_check_url_ssrf():
    # Private IPs / Localhost
    res = check_url("http://127.0.0.1/api")
    assert res.decision == "blocked"
    assert "private network" in res.reason
    
    res = check_url("http://192.168.1.100/data")
    assert res.decision == "blocked"
    assert "private network" in res.reason
    
    res = check_url("http://localhost:3000")
    assert res.decision == "blocked"
    assert "private network" in res.reason or "could not be resolved" in res.reason or "private network address" in res.reason

def test_check_url_keywords():
    # DRM/restricted keywords
    res = check_url("https://example.com/movie-drm-protected")
    assert res.decision == "blocked"
    assert "restricted content indicator" in res.reason
    
    res = check_url("https://example.com/premium/video.mp4")
    assert res.decision == "blocked"
    assert "restricted content indicator" in res.reason

def test_check_url_whitelist():
    # Whitelisted open-access platforms
    res = check_url("https://upload.wikimedia.org/wikipedia/commons/c/c2/sample.webm")
    assert res.decision == "allowed"
    assert "wikimedia.org" in res.reason
    
    res = check_url("https://archive.org/details/sample_video")
    assert res.decision == "allowed"
    assert "archive.org" in res.reason

    res = check_url("https://archive.org.evil.example/video")
    assert res.decision == "needs_confirmation"
