import asyncio
import gzip
import io
from types import SimpleNamespace

import pytest
from yt_dlp.extractor.common import InfoExtractor
from yt_dlp.networking.common import Response
from yt_dlp.networking.exceptions import HTTPError

import app.yt_dlp_service as service
from app.errors import AppError


class TrackingStream(io.BytesIO):
    def __init__(self, content):
        super().__init__(content)
        self.bytes_read = 0
        self.read_sizes = []

    def read(self, size=-1):
        self.read_sizes.append(size)
        chunk = super().read(size)
        self.bytes_read += len(chunk)
        return chunk


@pytest.mark.parametrize("content_length", [None, "1", "1000000000"])
def test_metadata_limits_actual_bytes_regardless_of_content_length(
    monkeypatch, content_length
):
    monkeypatch.setattr(service, "_MAX_METADATA_RESPONSE_BYTES", 64)
    stream = TrackingStream(b"x" * 1024)
    headers = {"Content-Length": content_length} if content_length else {}
    response = Response(stream, "https://example.com/page", headers)
    budget = SimpleNamespace(remaining_metadata_bytes=128)
    limited = service._LimitedMetadataResponse(response, budget)

    with pytest.raises(service.MetadataLimitExceeded):
        limited.read()

    assert stream.bytes_read == 65
    assert all(0 < size <= 65 for size in stream.read_sizes)
    assert stream.closed


def test_compressed_metadata_is_limited_after_decompression(monkeypatch):
    monkeypatch.setattr(service, "_MAX_METADATA_RESPONSE_BYTES", 64)
    compressed = io.BytesIO(gzip.compress(b"x" * 1024))
    decompressed = gzip.GzipFile(fileobj=compressed)
    response = Response(decompressed, "https://example.com/page", {})
    budget = SimpleNamespace(remaining_metadata_bytes=128)

    with service._LimitedMetadataResponse(response, budget) as limited:
        with pytest.raises(service.MetadataLimitExceeded):
            limited.read()
    assert decompressed.closed


def test_metadata_budget_is_shared_by_responses_and_incremental_reads(monkeypatch):
    monkeypatch.setattr(service, "_MAX_METADATA_RESPONSE_BYTES", 64)
    budget = SimpleNamespace(remaining_metadata_bytes=80)
    first = Response(io.BytesIO(b"a" * 50), "https://example.com/first", {})
    with service._LimitedMetadataResponse(first, budget) as limited:
        assert limited.read(10) == b"a" * 10
        assert limited.read() == b"a" * 40

    second_stream = TrackingStream(b"b" * 50)
    second = Response(second_stream, "https://example.com/second", {})
    with service._LimitedMetadataResponse(second, budget) as limited:
        with pytest.raises(service.MetadataLimitExceeded):
            limited.read()
    assert second_stream.bytes_read == 31


def test_real_downloader_wraps_responses_and_does_not_retry_oversized_html(monkeypatch):
    monkeypatch.setattr(service, "_MAX_METADATA_RESPONSE_BYTES", 64)
    monkeypatch.setattr(
        service,
        "get_settings",
        lambda: SimpleNamespace(
            media_egress_proxy="http://proxy.example:3128", resolved_js_runtime=None
        ),
    )
    streams = []

    def fake_urlopen(_self, _request):
        stream = TrackingStream(b"<html>" + b"x" * 1024)
        streams.append(stream)
        return Response(
            stream, "https://example.com/page", {"Content-Type": "text/html"}
        )

    def extract_html(self, url, *, download):
        assert download is False
        self.urlopen(url).read()
        raise AssertionError("Oversized HTML must never reach metadata parsing")

    monkeypatch.setattr(service.yt_dlp.YoutubeDL, "urlopen", fake_urlopen)
    monkeypatch.setattr(service.yt_dlp.YoutubeDL, "extract_info", extract_html)

    with pytest.raises(AppError) as error:
        asyncio.run(service.extract_metadata("https://example.com/page"))

    assert error.value.code == "ANALYSIS_FAILED"
    assert len(streams) == 1
    assert streams[0].bytes_read == 65


def test_metadata_response_at_exact_limit_is_accepted(monkeypatch):
    monkeypatch.setattr(service, "_MAX_METADATA_RESPONSE_BYTES", 64)
    budget = SimpleNamespace(remaining_metadata_bytes=64)
    response = Response(io.BytesIO(b"a" * 64), "https://example.com/page", {})
    with service._LimitedMetadataResponse(response, budget) as limited:
        assert limited.read(0) == b""
        assert limited.read() == b"a" * 64
        assert limited.read() == b""


def test_expected_http_error_body_cannot_bypass_metadata_limit(monkeypatch):
    monkeypatch.setattr(service, "_MAX_METADATA_RESPONSE_BYTES", 64)
    stream = TrackingStream(b"<html>" + b"x" * 1024)

    def error_response(_self, _request):
        raise HTTPError(Response(stream, "https://example.com/page", {}, status=403))

    monkeypatch.setattr(service.yt_dlp.YoutubeDL, "urlopen", error_response)
    with service._MetadataYoutubeDL({"quiet": True}) as downloader:
        extractor = InfoExtractor(downloader)
        with pytest.raises(service.MetadataLimitExceeded):
            extractor._download_webpage(
                "https://example.com/page", "test", expected_status=403
            )
    assert stream.bytes_read == 65
    assert stream.closed


def test_metadata_does_not_use_transport_that_prebuffers_compressed_responses():
    with service._MetadataYoutubeDL({"quiet": True}) as downloader:
        assert "Urllib" not in downloader._request_director.handlers
        assert "CurlCFFI" in downloader._request_director.handlers
