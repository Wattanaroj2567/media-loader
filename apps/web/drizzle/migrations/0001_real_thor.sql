ALTER TABLE "download_jobs" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "download_jobs" ADD COLUMN "guest_session_id" text;--> statement-breakpoint
ALTER TABLE "download_jobs" ADD COLUMN "total_bytes_estimate" bigint;--> statement-breakpoint
CREATE INDEX "idx_download_jobs_guest_session" ON "download_jobs" USING btree ("guest_session_id");