import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// --- Base entities (T005) ---------------------------------------------

export const households = sqliteTable("households", {
  id: text("id").primaryKey(),
  name: text("name"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
});

export const caregivers = sqliteTable("caregivers", {
  id: text("id").primaryKey(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id),
  displayName: text("display_name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
});

export const caregiverDevices = sqliteTable("caregiver_devices", {
  id: text("id").primaryKey(),
  caregiverId: text("caregiver_id")
    .notNull()
    .references(() => caregivers.id),
  deviceTokenHash: text("device_token_hash").notNull().unique(),
  label: text("label"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull()
});

export const babyProfiles = sqliteTable("baby_profiles", {
  id: text("id").primaryKey(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id),
  name: text("name").notNull(),
  birthdate: text("birthdate").notNull(), // ISO date (YYYY-MM-DD)
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
});

// Composite-key join table: which caregivers may access which baby profiles.
export const caregiverBabyAccess = sqliteTable("caregiver_baby_access", {
  caregiverId: text("caregiver_id")
    .notNull()
    .references(() => caregivers.id),
  babyId: text("baby_id")
    .notNull()
    .references(() => babyProfiles.id),
  status: text("status", { enum: ["active", "revoked"] })
    .notNull()
    .default("active"),
  joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull()
});

// --- User Story 1: Log & sync care events (T015) -----------------------

export type CareEventType = "feed" | "diaper" | "sleep" | "pumping";

export const careEvents = sqliteTable("care_events", {
  id: text("id").primaryKey(), // client-generated UUID — sync idempotency key
  babyId: text("baby_id")
    .notNull()
    .references(() => babyProfiles.id),
  type: text("type", { enum: ["feed", "diaper", "sleep", "pumping"] }).notNull(),
  startTime: integer("start_time", { mode: "timestamp_ms" }).notNull(),
  endTime: integer("end_time", { mode: "timestamp_ms" }), // null while a sleep session is in progress
  loggedByCaregiverId: text("logged_by_caregiver_id")
    .notNull()
    .references(() => caregivers.id),
  lastModifiedByCaregiverId: text("last_modified_by_caregiver_id")
    .notNull()
    .references(() => caregivers.id),
  notes: text("notes"),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }), // soft delete (tombstone) for sync
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull()
});

// --- User Story 4: Growth & milestones (T036) ---------------------------

export const growthMeasurements = sqliteTable("growth_measurements", {
  id: text("id").primaryKey(),
  babyId: text("baby_id")
    .notNull()
    .references(() => babyProfiles.id),
  date: text("date").notNull(), // ISO date
  weight: integer("weight"), // stored as grams
  length: integer("length"), // stored as millimeters
  headCircumference: integer("head_circumference"), // millimeters
  loggedByCaregiverId: text("logged_by_caregiver_id")
    .notNull()
    .references(() => caregivers.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
});

export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  babyId: text("baby_id")
    .notNull()
    .references(() => babyProfiles.id),
  date: text("date").notNull(),
  description: text("description").notNull(),
  photoRef: text("photo_ref"), // local filename under backend uploads dir — never an external CDN (FR-015)
  loggedByCaregiverId: text("logged_by_caregiver_id")
    .notNull()
    .references(() => caregivers.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
});

// --- User Story 5: Reminders (T041) --------------------------------------

export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  babyId: text("baby_id")
    .notNull()
    .references(() => babyProfiles.id),
  eventType: text("event_type", { enum: ["feed", "diaper", "sleep", "pumping", "medicine"] }).notNull(),
  intervalMinutes: integer("interval_minutes").notNull(),
  createdByCaregiverId: text("created_by_caregiver_id")
    .notNull()
    .references(() => caregivers.id),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
});

// Invite codes (T025/US2, pulled forward into Foundational: redeeming an
// invite is how the very first caregiver is created, so it's load-bearing
// for every user story, not just US2 — see plan.md Constitution Check notes).
export const inviteCodes = sqliteTable("invite_codes", {
  id: text("id").primaryKey(),
  babyId: text("baby_id")
    .notNull()
    .references(() => babyProfiles.id),
  code: text("code").notNull().unique(),
  mode: text("mode", { enum: ["new_caregiver", "add_device"] }).notNull(),
  targetCaregiverId: text("target_caregiver_id").references(() => caregivers.id),
  createdByCaregiverId: text("created_by_caregiver_id").references(() => caregivers.id),
  status: text("status", { enum: ["active", "redeemed", "revoked", "expired"] })
    .notNull()
    .default("active"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
});
