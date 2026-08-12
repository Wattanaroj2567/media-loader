from pathlib import Path

from worker.config import Settings


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


def test_worker_resolves_managed_media_runtimes():
    settings = Settings(node_path="", ffmpeg_path="")

    assert settings.resolved_js_runtime is not None
    assert settings.resolved_js_runtime[1].is_file()
    assert settings.resolved_ffmpeg_executable.is_file()


def test_worker_prefers_configured_deno_runtime(tmp_path):
    deno = tmp_path / "deno.exe"
    deno.write_bytes(b"test runtime")

    settings = Settings(deno_path=str(deno), node_path="")

    assert settings.resolved_js_runtime == ("deno", deno.resolve())
