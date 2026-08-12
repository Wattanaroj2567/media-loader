from pathlib import Path

from app.config import Settings


def test_relative_temp_dir_is_resolved_from_the_repository_root():
    settings = Settings(temp_dir="tmp/media-loader")

    assert settings.resolved_temp_dir == (
        Path(__file__).resolve().parents[3] / "tmp" / "media-loader"
    )
