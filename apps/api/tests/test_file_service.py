from pathlib import Path

import pytest

from app.errors import AppError
from app.file_service import delete_local_output, resolve_local_output


def test_resolve_local_output_accepts_only_files_inside_temp_root(tmp_path: Path):
    job_dir = tmp_path / "job-1"
    job_dir.mkdir()
    output = job_dir / "clip.mp4"
    output.write_bytes(b"media")

    assert resolve_local_output(str(output), tmp_path) == output.resolve()

    outside = tmp_path.parent / "outside.mp4"
    outside.write_bytes(b"outside")
    with pytest.raises(AppError) as error:
        resolve_local_output(str(outside), tmp_path)
    assert error.value.code == "UNSAFE_FILE_PATH"


def test_delete_local_output_removes_file_and_empty_job_directory(tmp_path: Path):
    job_dir = tmp_path / "job-2"
    job_dir.mkdir()
    output = job_dir / "clip.mp3"
    output.write_bytes(b"media")

    assert delete_local_output(str(output), tmp_path) is True
    assert output.exists() is False
    assert job_dir.exists() is False


def test_delete_local_output_is_idempotent_for_missing_path(tmp_path: Path):
    missing = tmp_path / "job-3" / "missing.mp4"
    assert delete_local_output(str(missing), tmp_path) is False

