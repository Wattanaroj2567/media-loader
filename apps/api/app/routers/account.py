"""Authenticated account deletion endpoint."""

from fastapi import APIRouter, Depends

from app.account_service import delete_account
from app.auth import CurrentUser, get_current_user
from app.config import get_settings
from app.response import success_response

router = APIRouter(prefix="/account", tags=["account"])


@router.delete("")
async def delete_current_account(
    current_user: CurrentUser = Depends(get_current_user),
):
    delete_account(
        current_user.id,
        temp_root=get_settings().resolved_temp_dir,
    )
    return success_response(data={"deleted": True})
