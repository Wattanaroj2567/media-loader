"""User account cleanup and Supabase Auth deletion."""

import logging
from datetime import datetime, timezone
from pathlib import Path

from app.errors import AppError
from app.file_service import delete_local_output
from app.job_service import CANCELLABLE_STATUSES
from app.supabase_client import get_supabase_client

logger = logging.getLogger("media_loader_api.account_service")


def delete_account(user_id: str, *, temp_root: str | Path) -> None:
    supabase = get_supabase_client()
    if not supabase:
        raise AppError(503, "DB_UNAVAILABLE", "ระบบบัญชียังไม่พร้อมใช้งาน")
    try:
        result = (
            supabase.table("download_jobs")
            .select("id,status,storage_path")
            .eq("user_id", user_id)
            .execute()
        )
        for job in result.data:
            if job.get("status") in CANCELLABLE_STATUSES:
                (
                    supabase.table("download_jobs")
                    .update(
                        {
                            "status": "CANCELLED",
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }
                    )
                    .eq("id", job["id"])
                    .eq("user_id", user_id)
                    .execute()
                )
            try:
                delete_local_output(job.get("storage_path"), temp_root)
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
