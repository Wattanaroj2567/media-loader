from pathlib import Path

from app.routers.files import build_download_filename


def test_download_filename_preserves_thai_title_instead_of_restricted_temp_name():
    job = {
        "title": "แคนข้างนางฟ้า - คู่เคน Ft. ก้อง ห้วยไร่ [Official Music Video]",
        "output_filename": "Ft._Official_Music_Video.mp4",
        "output_format": "mp4",
    }

    assert build_download_filename(job, Path("Ft._Official_Music_Video.mp4")) == (
        "แคนข้างนางฟ้า - คู่เคน Ft. ก้อง ห้วยไร่ [Official Music Video].mp4"
    )


def test_download_filename_sanitizes_only_filesystem_unsafe_title_characters():
    job = {"title": "เพลง: ตอนที่ 1?", "output_format": "mp4"}

    assert build_download_filename(job, Path("temporary.mp4")) == "เพลง_ ตอนที่ 1_.mp4"


def test_download_filename_falls_back_to_temp_name_without_a_media_title():
    job = {"title": None, "output_filename": "safe-output.mp3"}

    assert build_download_filename(job, Path("safe-output.mp3")) == "safe-output.mp3"
