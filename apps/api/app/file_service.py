"""Safe operations for local temporary media outputs."""

from pathlib import Path

from app.errors import AppError


def resolve_local_output(path: str, temp_root: str | Path) -> Path:
    root = Path(temp_root).resolve()
    candidate = Path(path).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as error:
        raise AppError(
            400,
            "UNSAFE_FILE_PATH",
            "ตำแหน่งไฟล์อยู่นอกพื้นที่ชั่วคราวที่อนุญาต",
        ) from error
    return candidate


def delete_local_output(path: str | None, temp_root: str | Path) -> bool:
    if not path:
        return False
    candidate = resolve_local_output(path, temp_root)
    if not candidate.exists() or not candidate.is_file():
        return False
    candidate.unlink()
    root = Path(temp_root).resolve()
    parent = candidate.parent
    if parent != root:
        try:
            parent.rmdir()
        except OSError:
            pass
    return True


def local_output_exists(path: str | None, temp_root: str | Path) -> bool:
    """Return whether a persisted local output is still safe and available.

    Database metadata can outlive a retention cleanup or an older deployment.
    Treat an invalid or unavailable path as absent without attempting to touch
    it, so the History UI never offers a file that cannot be delivered.
    """
    if not path:
        return False
    try:
        candidate = resolve_local_output(path, temp_root)
    except AppError:
        return False
    return candidate.is_file()
