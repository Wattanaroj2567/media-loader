from pathlib import Path

from app.config import Settings


def test_relative_temp_dir_is_resolved_from_the_repository_root():
    settings = Settings(temp_dir="tmp/media-loader")

    assert settings.resolved_temp_dir == (
        Path(__file__).resolve().parents[3] / "tmp" / "media-loader"
    )


def test_worker_pool_defaults_local_and_detects_railway():
    assert Settings(worker_pool="", railway_environment_id="").resolved_worker_pool == "local"
    assert (
        Settings(worker_pool="", railway_environment_id="env-id").resolved_worker_pool
        == "railway"
    )
    assert Settings(worker_pool="My PC", railway_environment_id="").queue_target_marker == "pool:my-pc"


def test_api_resolves_youtube_javascript_runtime():
    runtime = Settings(node_path="", deno_path="").resolved_js_runtime

    assert runtime is not None
    assert runtime[0] in {"deno", "node"}
    assert runtime[1].is_file()
