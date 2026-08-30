"""Tests for secure one-time download token generation and validation."""

import time
import pytest
from app.auth import generate_download_token, verify_download_token
from app.errors import AppError


def test_download_token_lifecycle():
    job_id = "test-job-123"
    user_id = "user-abc-456"

    token = generate_download_token(job_id=job_id, user_id=user_id, expires_in_seconds=60)
    assert token and "." in token

    # Verification returns correct user_id
    verified_user_id = verify_download_token(token=token, expected_job_id=job_id)
    assert verified_user_id == user_id


def test_download_token_tampered():
    job_id = "test-job-123"
    user_id = "user-abc-456"

    token = generate_download_token(job_id=job_id, user_id=user_id, expires_in_seconds=60)
    payload, sig = token.split(".")
    tampered_token = f"{payload}tampered.{sig}"

    with pytest.raises(AppError) as exc:
        verify_download_token(token=tampered_token, expected_job_id=job_id)
    assert exc.value.status_code == 401
    assert exc.value.code == "INVALID_DOWNLOAD_TOKEN"


def test_download_token_wrong_job_id():
    job_id = "test-job-123"
    wrong_job_id = "test-job-999"
    user_id = "user-abc-456"

    token = generate_download_token(job_id=job_id, user_id=user_id, expires_in_seconds=60)

    with pytest.raises(AppError) as exc:
        verify_download_token(token=token, expected_job_id=wrong_job_id)
    assert exc.value.status_code == 401
    assert exc.value.code == "INVALID_DOWNLOAD_TOKEN"


def test_download_token_expired():
    job_id = "test-job-123"
    user_id = "user-abc-456"

    # Token with 0 second TTL
    token = generate_download_token(job_id=job_id, user_id=user_id, expires_in_seconds=-1)

    with pytest.raises(AppError) as exc:
        verify_download_token(token=token, expected_job_id=job_id)
    assert exc.value.status_code == 401
    assert exc.value.code == "DOWNLOAD_TOKEN_EXPIRED"

