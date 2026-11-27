# pyright: reportArgumentType=error, reportAttributeAccessIssue=error
# pyright: reportOptionalMemberAccess=error, reportOptionalSubscript=error, reportIndexIssue=error
"""User account cleanup and Supabase Auth deletion."""

import logging
from datetime import datetime, timezone
from pathlib import Path

from app.errors import AppError
from app.file_service import delete_local_output
from app.job_service import CANCELLABLE_STATUSES
from app.r2_storage import delete_r2_object
from app.supabase_client import get_supabase_client

logger = logging.getLogger("media_loader_api.account_service")


def delete_account(user_id: str, *, temp_root: str | Path) -> None:
    supabase = get_supabase_client()
    if not supabase:
        raise AppError(503, "DB_UNAVAILABLE", "ระบบบัญชียังไม่พร้อมใช้งาน")
    try:
        result = (
            supabase.table("download_jobs")
            .select("id,status,storage_bucket,storage_path")
            .eq("user_id", user_id)
            .execute()
        )
        jobs = []
        for row in result.data:
            if not isinstance(row, dict):
                raise TypeError("Expected a download job object from the database")
            job_id = row.get("id")
            status = row.get("status")
            bucket = row.get("storage_bucket")
            path = row.get("storage_path")
            if not isinstance(job_id, str) or not isinstance(status, str):
                raise TypeError("Expected a download job ID and status")
            if (bucket is not None and not isinstance(bucket, str)) or (
                path is not None and not isinstance(path, str)
            ):
                raise TypeError("Expected string or null storage fields")
            jobs.append((job_id, status, bucket, path))

        for job_id, status, bucket, path in jobs:
            if status in CANCELLABLE_STATUSES:
                (
                    supabase.table("download_jobs")
                    .update(
                        {
                            "status": "CANCELLED",
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }
                    )
                    .eq("id", job_id)
                    .eq("user_id", user_id)
                    .execute()
                )
            try:
                if bucket:
                    delete_r2_object(bucket, path)
                else:
                    delete_local_output(path, temp_root)
            except AppError:
                logger.warning("Skipped unsafe output while deleting account")
        supabase.auth.admin.delete_user(user_id)
    except AppError:
        raise
    except Exception as error:
        logger.error("Account deletion failed: %s", type(error).__name__)
        raise AppError(
            500, "ACCOUNT_DELETE_FAILED", "ไม่สามารถลบบัญชีได้ โปรดลองอีกครั้ง"
        ) from error
