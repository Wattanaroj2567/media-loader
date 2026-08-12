"""
Worker Main Entry Point.

Polls for queued jobs and processes them using the media processor.
"""

import asyncio
import logging
import signal
import sys
from worker.cleanup import cleanup_expired_outputs
from worker.config import get_settings
from worker.job_queue import (
    get_job_status,
    is_job_cancelled,
    poll_queued_job,
    release_job_lock,
    update_job_status,
)
from worker.processor import process_job

# Configure logging
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("media_loader_worker.main")

# Global shutdown flag
shutdown_requested = False


def handle_shutdown(signum, frame):
    """Handle shutdown signals gracefully."""
    global shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_requested = True


# Register signal handlers
signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)


async def worker_loop():
    """Main worker loop that polls and processes jobs."""
    logger.info(f"Worker {settings.worker_id} starting...")
    logger.info(f"Worker pool: {settings.resolved_worker_pool}")
    js_runtime = settings.resolved_js_runtime
    logger.info(
        "YouTube JavaScript runtime: %s",
        js_runtime[0] if js_runtime else "unavailable",
    )
    logger.info("FFmpeg runtime: available")
    logger.info(f"Poll interval: {settings.poll_interval_seconds}s")
    logger.info(f"Temp directory: {settings.resolved_temp_dir}")
    logger.info(f"Media output mode: {settings.media_output_mode}")

    loop = asyncio.get_running_loop()
    last_cleanup_at = float("-inf")
    cleanup_interval_seconds = max(
        60,
        min(900, settings.temp_file_retention_minutes * 15),
    )

    while not shutdown_requested:
        try:
            if loop.time() - last_cleanup_at >= cleanup_interval_seconds:
                await asyncio.to_thread(
                    cleanup_expired_outputs,
                    settings.resolved_temp_dir,
                    settings.temp_file_retention_minutes,
                )
                last_cleanup_at = loop.time()

            # Poll for a queued job
            job = poll_queued_job()

            if job:
                job_id = job.get("id")
                logger.info(f"Processing job {job_id}")

                try:
                    # Process the job
                    success = await process_job(job)

                    if not success:
                        status = get_job_status(job_id)
                        if status not in {"FAILED", "CANCELLED", "BLOCKED", "COMPLETED", "PAUSED", "NETWORK_ERROR"}:
                            update_job_status(job_id, "FAILED", error_message="Processing failed")

                except Exception as e:
                    logger.error(f"Error processing job {job_id}: {e}")
                    status = get_job_status(job_id)
                    if status not in {"FAILED", "CANCELLED", "BLOCKED", "COMPLETED", "PAUSED", "NETWORK_ERROR"}:
                        update_job_status(
                            job_id,
                            "FAILED",
                            error_message="Processing failed",
                        )

                finally:
                    # Release the lock
                    release_job_lock(job_id)
            else:
                # No job available, wait before next poll
                await asyncio.sleep(settings.poll_interval_seconds)

        except Exception as e:
            logger.error(f"Error in worker loop: {e}")
            await asyncio.sleep(settings.poll_interval_seconds)

    logger.info("Worker shutdown complete")


def main():
    """Main entry point."""
    try:
        asyncio.run(worker_loop())
    except KeyboardInterrupt:
        logger.info("Worker interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Worker crashed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
