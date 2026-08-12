import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  pgSchema,
  index,
} from "drizzle-orm/pg-core";

// Reference the auth schema from Supabase
export const authSchema = pgSchema("auth");

// Reference the auth.users table
export const users = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// Profiles table in public schema
export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Download jobs table
export const downloadJobs = pgTable(
  "download_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    originalUrl: text("original_url").notNull(),
    platform: text("platform").default("unknown").notNull(),
    title: text("title"),
    uploader: text("uploader"),
    sourceDomain: text("source_domain"),
    thumbnailUrl: text("thumbnail_url"),
    durationSeconds: integer("duration_seconds"),
    mediaType: text("media_type").default("unknown").notNull(),
    selectedFormatId: text("selected_format_id"),
    selectedQuality: text("selected_quality"),
    selectedHasAudio: boolean("selected_has_audio").default(false).notNull(),
    outputFormat: text("output_format"),
    status: text("status").default("PENDING").notNull(),
    progress: integer("progress").default(0).notNull(),
    errorMessage: text("error_message"),
    storageBucket: text("storage_bucket"),
    storagePath: text("storage_path"),
    fileSize: bigint("file_size", { mode: "bigint" }),
    rightsConfirmed: boolean("rights_confirmed").default(false).notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    downloadSpeed: bigint("download_speed", { mode: "bigint" }),
  },
  (table) => {
    return {
      userIdCreatedAtIdx: index("idx_download_jobs_user_id_created_at").on(
        table.userId,
        table.createdAt,
      ),
      statusIdx: index("idx_download_jobs_status").on(table.status),
    };
  },
);

// Policy logs table
export const policyLogs = pgTable(
  "policy_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    url: text("url").notNull(),
    platform: text("platform").default("unknown").notNull(),
    decision: text("decision").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      userIdCreatedAtIdx: index("idx_policy_logs_user_id_created_at").on(
        table.userId,
        table.createdAt,
      ),
    };
  },
);
