CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE TABLE "download_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"original_url" text NOT NULL,
	"platform" text DEFAULT 'unknown' NOT NULL,
	"title" text,
	"uploader" text,
	"source_domain" text,
	"thumbnail_url" text,
	"duration_seconds" integer,
	"media_type" text DEFAULT 'unknown' NOT NULL,
	"selected_format_id" text,
	"selected_quality" text,
	"selected_has_audio" boolean DEFAULT false NOT NULL,
	"output_format" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"storage_bucket" text,
	"storage_path" text,
	"file_size" bigint,
	"rights_confirmed" boolean DEFAULT false NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"download_speed" bigint
);
--> statement-breakpoint
CREATE TABLE "media_formats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"user_id" uuid NOT NULL,
	"format_id" text NOT NULL,
	"extension" text,
	"resolution" text,
	"fps" integer,
	"video_codec" text,
	"audio_codec" text,
	"bitrate" integer,
	"filesize" bigint,
	"is_video" boolean DEFAULT false NOT NULL,
	"is_audio" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"url" text NOT NULL,
	"platform" text DEFAULT 'unknown' NOT NULL,
	"decision" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"full_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "download_jobs" ADD CONSTRAINT "download_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_formats" ADD CONSTRAINT "media_formats_job_id_download_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."download_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_formats" ADD CONSTRAINT "media_formats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_logs" ADD CONSTRAINT "policy_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_download_jobs_user_id_created_at" ON "download_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_download_jobs_status" ON "download_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_media_formats_user_id" ON "media_formats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_policy_logs_user_id_created_at" ON "policy_logs" USING btree ("user_id","created_at");