import asyncio

import pytest

import app.yt_dlp_service as yt_dlp_service
from app.errors import AppError
from app.yt_dlp_service import (
    _run_yt_dlp_sync,
    extract_metadata,
    normalize_extractor_result,
)


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
    assert (
        next(item for item in videos if item.height == 2160).quality_label
        == "2160p · 30 FPS"
    )
    assert [item.bitrate for item in audio] == [160, 128]


@pytest.mark.parametrize(
    ("input_url", "expected_platform", "expected_domain"),
    [
        ("https://www.instagram.com/reel/example/", "Instagram", "instagram.com"),
        ("https://www.tiktok.com/@creator/video/123", "TikTok", "tiktok.com"),
        ("https://www.facebook.com/watch/?v=123", "Facebook", "facebook.com"),
        ("https://x.com/i/status/123", "X", "x.com"),
        ("https://www.bilibili.com/video/BV123", "Bilibili", "bilibili.com"),
        ("https://vk.com/video-123_456", "VK Video", "vk.com"),
        ("https://media.giphy.com/media/example/giphy.gif", "Giphy", "media.giphy.com"),
    ],
)
def test_normalize_extractor_result_preserves_submitted_platform_identity(
    input_url, expected_platform, expected_domain
):
    """A redirect must not relabel the platform the user submitted."""
    media, _ = normalize_extractor_result(
        {
            "title": "Redirected media",
            "extractor_key": "Youtube",
            "webpage_url_domain": "youtube.com",
            "_media_loader_input_url": input_url,
            "formats": [],
        }
    )

    assert media.platform == expected_platform
    assert media.source_domain == expected_domain


def test_normalize_extractor_result_uses_vk_platform_after_youtube_redirect():
    media, _ = normalize_extractor_result(
        {
            "title": "VK mirror",
            "extractor_key": "Youtube",
            "webpage_url_domain": "youtube.com",
            "webpage_url": "https://www.youtube.com/watch?v=redirected",
            "_media_loader_input_url": "https://vk.com/video-23220404_456239210",
            "formats": [],
        }
    )

    assert media.platform == "VK Video"
    assert media.source_domain == "vk.com"


def test_normalize_extractor_result_preserves_real_zero_platform_counts():
    media, _ = normalize_extractor_result(
        {
            "title": "New public clip",
            "extractor_key": "Youtube",
            "view_count": 0,
            "like_count": 0,
            "formats": [],
        }
    )

    assert media.view_count == 0
    assert media.like_count == 0


def test_facebook_reel_prefers_the_visible_title_view_count():
    media, _ = normalize_extractor_result(
        {
            "title": "171K views · 35K reactions | #คลิปReels | ต้าวว.แพม",
            "extractor_key": "Facebook",
            "webpage_url_domain": "m.facebook.com",
            "view_count": 63_022,
            "formats": [],
        }
    )

    assert media.title == "#คลิปReels | ต้าวว.แพม"
    assert media.view_count == 171_000


def test_facebook_reel_exposes_reactions_without_calling_them_likes():
    media, _ = normalize_extractor_result(
        {
            "title": "171K views · 35K reactions | #คลิปReels | ต้าวว.แพม",
            "extractor_key": "Facebook",
            "webpage_url_domain": "m.facebook.com",
            "view_count": 63_022,
            "formats": [],
        }
    )

    assert media.like_count is None
    assert media.reaction_count == 35_000


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


def test_normalize_extractor_result_ignores_implausible_audio_bitrate_without_duration():
    _, formats = normalize_extractor_result(
        {
            "title": "Audio with unreliable bitrate",
            "formats": [
                {
                    "format_id": "audio",
                    "ext": "mp4",
                    "vcodec": "none",
                    "acodec": "mp4a.40.2",
                    "abr": 62573,
                    "filesize": 76_933_078,
                }
            ],
        }
    )

    audio = formats[0]
    assert audio.bitrate is None
    assert audio.quality_label == "Original audio · MP4A"
    assert audio.filesize == 76_933_078


def test_normalize_extractor_result_keeps_tiktok_audio_only_format():
    _, formats = normalize_extractor_result(
        {
            "title": "TikTok clip",
            "extractor_key": "TikTok",
            "duration": 12,
            "formats": [
                {
                    "format_id": "video-1080",
                    "ext": "mp4",
                    "vcodec": "h264",
                    "acodec": "aac",
                    "height": 1920,
                    "width": 1080,
                    "tbr": 1727,
                },
                {
                    "format_id": "audio",
                    "ext": "mp3",
                    "vcodec": "none",
                    "acodec": "mp3",
                },
            ],
        }
    )

    assert [item.format_id for item in formats if item.type == "audio"] == ["audio"]


def test_normalize_extractor_result_keeps_codec_unknown_animated_media():
    media, formats = normalize_extractor_result(
        {
            "title": "Animated post",
            "extractor_key": "Twitter",
            "webpage_url_domain": "x.com",
            "video_ext": "mp4",
            "audio_ext": "none",
            "formats": [
                {
                    "format_id": "http",
                    "ext": "mp4",
                    "protocol": "https",
                    "vcodec": None,
                    "acodec": None,
                    "url": "https://video.twimg.com/tweet_video/example.mp4",
                }
            ],
        }
    )

    assert media.is_animated_gif is True
    assert len(formats) == 1
    assert formats[0].format_id == "http"
    assert formats[0].type == "video"
    assert formats[0].extension == "mp4"
    assert formats[0].quality_label == "Original video"
    assert formats[0].height is None
    assert formats[0].has_video is True
    assert formats[0].has_audio is False


def test_normalize_extractor_result_does_not_mark_normal_video_as_gif():
    media, _ = normalize_extractor_result(
        {
            "title": "Normal X video",
            "extractor_key": "Twitter",
            "webpage_url_domain": "x.com",
            "video_ext": "mp4",
            "formats": [
                {
                    "format_id": "video",
                    "ext": "mp4",
                    "vcodec": "avc1",
                    "acodec": "aac",
                    "height": 720,
                    "url": "https://video.twimg.com/amplify_video/example.mp4",
                }
            ],
        }
    )

    assert media.is_animated_gif is False


def test_normalize_extractor_result_marks_native_gif_on_any_platform():
    media, _ = normalize_extractor_result(
        {
            "title": "Native GIF",
            "extractor_key": "Generic",
            "video_ext": "gif",
            "formats": [
                {
                    "format_id": "gif",
                    "ext": "gif",
                    "url": "https://media.example/animation.gif",
                }
            ],
        }
    )

    assert media.is_animated_gif is True


def test_normalize_extractor_result_keeps_direct_gif_identity_after_cdn_redirect():
    media, _ = normalize_extractor_result(
        {
            "title": "Public Giphy animation",
            "extractor_key": "Generic",
            "webpage_url_domain": "media.giphy.com",
            "original_url": "https://media.giphy.com/media/animation/giphy.gif",
            "webpage_url": "https://media.giphy.com/media/animation/giphy.gif",
            "url": "https://i.giphy.com/media/animation/giphy.mp4",
            "ext": "mp4",
            "video_ext": "mp4",
            "audio_ext": "none",
            "format_id": "0",
            "formats": [],
        }
    )

    assert media.is_animated_gif is True
    assert media.platform == "Giphy"


def test_normalize_extractor_result_keeps_real_single_format_metadata_without_defaults():
    _, formats = normalize_extractor_result(
        {
            "title": "Silent CDN animation",
            "extractor_key": "Generic",
            "url": "https://i.giphy.com/media/animation/giphy.mp4",
            "ext": "mp4",
            "video_ext": "mp4",
            "audio_ext": "none",
            "format_id": "0",
            "vcodec": None,
            "acodec": None,
            "formats": [],
        }
    )

    assert len(formats) == 1
    assert formats[0].format_id == "0"
    assert formats[0].has_video is True
    assert formats[0].has_audio is False
    assert formats[0].height is None
    assert formats[0].fps is None


def test_extract_metadata_raises_clear_error_instead_of_fake_success(monkeypatch):
    def fail_extraction(_url: str):
        raise RuntimeError("extractor exploded")

    monkeypatch.setattr("app.yt_dlp_service._run_yt_dlp_sync", fail_extraction)

    with pytest.raises(AppError) as error:
        asyncio.run(extract_metadata("https://example.com/watch/1"))

    assert error.value.code == "ANALYSIS_FAILED"


def test_instagram_public_embed_supplies_real_view_count(monkeypatch):
    captured = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, _exc_type, _exc, _traceback):
            return False

        def read(self, limit):
            captured["read_limit"] = limit
            return b'<script>{\\"video_view_count\\":47366}</script>'

    def fake_urlopen(request, *, timeout):
        captured["url"] = request.full_url
        captured["user_agent"] = request.get_header("User-agent")
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(yt_dlp_service, "urlopen", fake_urlopen)

    view_count = yt_dlp_service._instagram_embed_view_count(
        "https://www.instagram.com/reel/DdFA0yrhKSj/"
        "?utm_source=ig_web_copy_link&stkn=public"
    )

    assert view_count == 47_366
    assert captured["url"] == ("https://www.instagram.com/reel/DdFA0yrhKSj/embed/")
    assert captured["user_agent"] == "Mozilla/5.0"
    assert captured["timeout"] == 15
    assert captured["read_limit"] <= 1_000_001


def test_instagram_analysis_enriches_missing_view_count_from_public_embed(monkeypatch):
    class FakeYoutubeDL:
        def __init__(self, _options):
            pass

        def __enter__(self):
            return self

        def __exit__(self, _exc_type, _exc, _traceback):
            return False

        def extract_info(self, _url, *, download):
            assert download is False
            return {
                "title": "Public Reel",
                "extractor_key": "Instagram",
                "view_count": None,
                "formats": [],
            }

    monkeypatch.setattr(yt_dlp_service.yt_dlp, "YoutubeDL", FakeYoutubeDL)
    monkeypatch.setattr(
        yt_dlp_service,
        "_instagram_embed_view_count",
        lambda _url: 47_366,
    )

    raw_info = _run_yt_dlp_sync("https://www.instagram.com/reel/DdFA0yrhKSj/")

    assert raw_info["view_count"] == 47_366


def test_youtube_analysis_uses_web_embedded_player_client(monkeypatch):
    captured_options = {}

    class FakeYoutubeDL:
        def __init__(self, options):
            captured_options.update(options)

        def __enter__(self):
            return self

        def __exit__(self, _exc_type, _exc, _traceback):
            return False

        def extract_info(self, _url, *, download):
            assert download is False
            return {"title": "Test media", "formats": []}

    monkeypatch.setattr(yt_dlp_service.yt_dlp, "YoutubeDL", FakeYoutubeDL)

    _run_yt_dlp_sync("https://www.youtube.com/watch?v=test")

    assert captured_options["extractor_args"]["youtube"]["player_client"] == [
        "web_embedded"
    ]


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
