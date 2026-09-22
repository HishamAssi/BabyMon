CREATE TABLE `baby_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`birthdate` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `care_events` (
	`id` text PRIMARY KEY NOT NULL,
	`baby_id` text NOT NULL,
	`type` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`logged_by_caregiver_id` text NOT NULL,
	`last_modified_by_caregiver_id` text NOT NULL,
	`notes` text,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`baby_id`) REFERENCES `baby_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`logged_by_caregiver_id`) REFERENCES `caregivers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_modified_by_caregiver_id`) REFERENCES `caregivers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `caregiver_baby_access` (
	`caregiver_id` text NOT NULL,
	`baby_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`caregiver_id`) REFERENCES `caregivers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`baby_id`) REFERENCES `baby_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `caregiver_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`caregiver_id` text NOT NULL,
	`device_token_hash` text NOT NULL,
	`label` text,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`caregiver_id`) REFERENCES `caregivers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `caregivers` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `growth_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`baby_id` text NOT NULL,
	`date` text NOT NULL,
	`weight` integer,
	`length` integer,
	`head_circumference` integer,
	`logged_by_caregiver_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`baby_id`) REFERENCES `baby_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`logged_by_caregiver_id`) REFERENCES `caregivers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invite_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`baby_id` text NOT NULL,
	`code` text NOT NULL,
	`mode` text NOT NULL,
	`target_caregiver_id` text,
	`created_by_caregiver_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`baby_id`) REFERENCES `baby_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_caregiver_id`) REFERENCES `caregivers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_caregiver_id`) REFERENCES `caregivers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`baby_id` text NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`photo_ref` text,
	`logged_by_caregiver_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`baby_id`) REFERENCES `baby_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`logged_by_caregiver_id`) REFERENCES `caregivers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`baby_id` text NOT NULL,
	`event_type` text NOT NULL,
	`interval_minutes` integer NOT NULL,
	`created_by_caregiver_id` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`baby_id`) REFERENCES `baby_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_caregiver_id`) REFERENCES `caregivers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `caregiver_devices_device_token_hash_unique` ON `caregiver_devices` (`device_token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `invite_codes_code_unique` ON `invite_codes` (`code`);