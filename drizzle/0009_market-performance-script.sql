ALTER TYPE "public"."package_mode" ADD VALUE 'performance-cn';--> statement-breakpoint
ALTER TYPE "public"."package_mode" ADD VALUE 'performance-intl';--> statement-breakpoint
ALTER TABLE "scripts" ADD COLUMN "market" text DEFAULT 'overseas' NOT NULL;--> statement-breakpoint
ALTER TABLE "scripts" ADD COLUMN "preview_lines" jsonb;--> statement-breakpoint
ALTER TABLE "scripts" ADD COLUMN "characters" jsonb;