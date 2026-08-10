import asyncio

import pytest

from app.errors import AppError
from app.yt_dlp_service import extract_metadata, normalize_extractor_result


def _video_format(height: int, format_id: str, **overrides):
    data = {
        "format_id": format_id,
        "ext": "mp4",
        "width": round(height * 16 / 9),
        "height": height,
        "fps": 30,
        "vcodec": "avc1.640028",
        "acodec": "none",
        "filesize_approx": height * 100_000,
        "tbr": height * 1.5,
        "protocol": "https",
    }
    data.update(overrides)
    return data


def test_normalize_extractor_result_returns_real_unique_video_heights():
    raw_info = {
        "title": "A real clip",
        "extractor_key": "Youtube",
        "duration": 125.8,
        "thumbnail": "https://img.example/clip.jpg",
        "uploader": "Clip Owner",
        "webpage_url_domain": "youtube.com",
        "view_count": 12345,
        "like_count": 678,
        "formats": [
            *[
                _video_format(height, f"v{height}")
                for height in (144, 240, 360, 720, 1080, 1440, 2160)
            ],
            _video_format(
                1080,
                "v1080-webm",
                ext="webm",
                vcodec="vp9",
                filesize_approx=999_000_000,
            ),
            {
                "format_id": "a128",
                "ext": "m4a",
                "vcodec": "none",
                "acodec": "mp4a.40.2",
                "abr": 128.4,
                "filesize_approx": 2_000_000,
                "protocol": "https",
            },
            {
                "format_id": "a160",
                "ext": "webm",
                "vcodec": "none",
                "acodec": "opus",
                "abr": 160,
                "filesize": 2_400_000,
                "protocol": "https",
            },
            {
                "format_id": "storyboard",
                "ext": "mhtml",
                "vcodec": "none",
                "acodec": "none",
                "protocol": "mhtml",
            },
        ],
    }

    media, formats = normalize_extractor_result(raw_info)

    assert media.title == "A real clip"
    assert media.uploader == "Clip Owner"
    assert media.source_domain == "youtube.com"
    assert media.duration_seconds == 125
    assert media.view_count == 12345
    assert media.like_count == 678

    videos = [item for item in formats if item.type == "video"]
    audio = [item for item in formats if item.type == "audio"]

    assert [item.height for item in videos] == [2160, 1440, 1080, 720, 360, 240, 144]
    assert len([item for item in videos if item.height == 1080 and item.fps == 30]) == 1
    assert next(item for item in videos if item.height == 1080).format_id == "v1080"
    assert next(item for item in videos if item.height == 2160).quality_label == "2160p · 30 FPS"
    assert [item.bitrate for item in audio] == [160, 128]


def test_normalize_extractor_result_preserves_nonstandard_height_when_real():
    _, formats = normalize_extractor_result(
        {
            "title": "Non-standard source",
            "formats": [_video_format(2460, "real-2460", fps=60)],
        }
    )

    video = next(item for item in formats if item.type == "video")
    assert video.height == 2460
    assert video.quality_label == "2460p · 60 FPS"


def test_extract_metadata_raises_clear_error_instead_of_fake_success(monkeypatch):
    def fail_extraction(_url: str):
        raise RuntimeError("extractor exploded")

    monkeypatch.setattr("app.yt_dlp_service._run_yt_dlp_sync", fail_extraction)

    with pytest.raises(AppError) as error:
        asyncio.run(extract_metadata("https://example.com/watch/1"))

    assert error.value.code == "ANALYSIS_FAILED"


def test_normalize_extractor_result_cleans_facebook_title_stats():
    raw_info = {
        "title": "1.4M views · 43K reactions | เซิ่งอวิ้นซู ทะลุมิติมายุคปัจจุบัน // #แมวติดซีรีย์จีน",
        "extractor_key": "Facebook",
        "duration": 72,
        "thumbnail": "https://img.example/fb.jpg",
        "webpage_url_domain": "facebook.com",
        "formats": [],
    }
    media, _ = normalize_extractor_result(raw_info)
    assert media.title == "เซิ่งอวิ้นซู ทะลุมิติมายุคปัจจุบัน // #แมวติดซีรีย์จีน"

    # Test single stats value
    raw_info_single = {
        "title": "12K views | Some other video",
        "extractor_key": "Facebook",
        "formats": [],
    }
    media_single, _ = normalize_extractor_result(raw_info_single)
    assert media_single.title == "Some other video"

    # Test non-stats values with |
    raw_info_normal = {
        "title": "Awesome Vlog | My channel",
        "extractor_key": "Youtube",
        "formats": [],
    }
    media_normal, _ = normalize_extractor_result(raw_info_normal)
    assert media_normal.title == "Awesome Vlog | My channel"

