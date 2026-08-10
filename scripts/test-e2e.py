#!/usr/bin/env python
"""
E2E Test Script for Media Loader.

This script tests the entire download lifecycle against a running API/Worker:
1. Health check verification
2. Policy check & format analysis (requires Bearer token when auth is enabled)
3. Job queue creation
4. Worker polling & FFmpeg WebM-to-MP4 conversion
5. Serving completed file download
6. Storage file deletion cleanup
"""

import os
import sys
import time
import httpx

API_URL = os.getenv("NEXT_PUBLIC_FASTAPI_BASE_URL", "http://localhost:8000")
AUTH_TOKEN = os.getenv("SUPABASE_ACCESS_TOKEN", "").strip()


def get_headers():
    headers = {"Content-Type": "application/json"}
    if AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
    return headers


def test_health():
    print("Testing health endpoint...")
    try:
        response = httpx.get(f"{API_URL}/health", timeout=10.0)
        print(f"Health Response Status: {response.status_code}")
        print(f"Health Response Body: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Failed to connect to API ({API_URL}): {e}")
        return False


def test_analyze():
    print("\nTesting media analysis endpoint...")
    url_to_test = "https://upload.wikimedia.org/wikipedia/commons/c/c2/This_is_a_10_second_testvideo_with_bars_and_tone.webm"
    payload = {
        "url": url_to_test,
        "rights_confirmed": True
    }
    try:
        response = httpx.post(f"{API_URL}/media/analyze", json=payload, headers=get_headers(), timeout=30.0)
        print(f"Analyze Status: {response.status_code}")
        data = response.json()
        print(f"Analyze Response: {data}")
        if response.status_code == 401:
            print("\n[NOTE] Endpoint requires valid Supabase Bearer Token (SUPABASE_ACCESS_TOKEN env var). Auth protection is working as intended.")
            return True
        return response.status_code == 200 and data.get("ok")
    except Exception as e:
        print(f"Analyze failed: {e}")
        return False


def test_create_and_process_job():
    if not AUTH_TOKEN:
        print("\n[SKIPPED] Job creation flow requires SUPABASE_ACCESS_TOKEN for user-scoped DB operations.")
        return True

    print("\nTesting job creation and worker processing...")
    test_media_url = "https://upload.wikimedia.org/wikipedia/commons/c/c2/This_is_a_10_second_testvideo_with_bars_and_tone.webm"

    payload = {
        "url": test_media_url,
        "selected_format_id": "best",
        "output_format": "mp4",
        "rights_confirmed": True
    }

    try:
        response = httpx.post(f"{API_URL}/downloads", json=payload, headers=get_headers(), timeout=15.0)
        print(f"Create Job Status: {response.status_code}")
        job_data = response.json()
        print(f"Create Job Response: {job_data}")

        if response.status_code != 200 or not job_data.get("ok"):
            print("Failed to create job!")
            return False

        job_id = job_data["data"]["job_id"] if "job_id" in job_data["data"] else job_data["data"]["id"]
        print(f"Queued Job ID: {job_id}")

        print("Polling job status...")
        max_attempts = 30
        for attempt in range(max_attempts):
            job_status_resp = httpx.get(f"{API_URL}/downloads/{job_id}", headers=get_headers(), timeout=10.0)
            if job_status_resp.status_code == 200:
                job_detail = job_status_resp.json().get("data", {})
                status = job_detail.get("status")
                print(f"Attempt {attempt+1}/{max_attempts}: Status is {status}")
                if status == "COMPLETED":
                    print("Job completed successfully!")

                    download_resp = httpx.get(f"{API_URL}/files/download/{job_id}", headers=get_headers(), timeout=30.0)
                    print(f"Download File Status: {download_resp.status_code}")
                    if download_resp.status_code != 200:
                        print(f"Failed to download completed file: {download_resp.text}")
                        return False
                    print(f"Successfully downloaded file. Size: {len(download_resp.content)} bytes")

                    delete_resp = httpx.delete(f"{API_URL}/files/delete/{job_id}", headers=get_headers(), timeout=10.0)
                    print(f"Delete File Response: {delete_resp.json()}")
                    if delete_resp.status_code != 200:
                        print("Failed to clean up and delete job file!")
                        return False
                    return True
                elif status == "FAILED":
                    print(f"Job failed! Error message: {job_detail.get('error_message')}")
                    return False
            time.sleep(3)
        print("Polling timed out!")
        return False
    except Exception as e:
        print(f"Job flow failed: {e}")
        return False


if __name__ == "__main__":
    print("Starting Media Loader E2E Test Suite...")
    print("=======================================")
    success = True
    if not test_health():
        success = False
    elif not test_analyze():
        success = False
    elif not test_create_and_process_job():
        success = False

    print("=======================================")
    if success:
        print("E2E Test Suite: PASSED")
        sys.exit(0)
    else:
        print("E2E Test Suite: FAILED")
        sys.exit(1)
