CREATE TABLE "showcase_settings" (
	"id" text PRIMARY KEY DEFAULT 'portal' NOT NULL,
	"reel_speed_px_per_second" integer DEFAULT 30 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "showcase_settings_reel_speed_check" CHECK ("showcase_settings"."reel_speed_px_per_second" between 15 and 60)
);
