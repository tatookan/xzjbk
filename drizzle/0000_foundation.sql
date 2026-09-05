CREATE TYPE "public"."asset_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."storage_provider" AS ENUM('local', 'oss');--> statement-breakpoint
CREATE TYPE "public"."ledger_direction" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "public"."ledger_source" AS ENUM('admin-adjustment', 'recharge', 'purchase', 'refund');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'completed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."recharge_status" AS ENUM('pending', 'paid', 'closed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."invite_code_status" AS ENUM('unused', 'used', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."package_mode" AS ENUM('bilingual-package', 'parallel-production');--> statement-breakpoint
CREATE TYPE "public"."presentation_mode" AS ENUM('narration', 'performance');--> statement-breakpoint
CREATE TYPE "public"."script_file_kind" AS ENUM('script', 'bilingual', 'chinese', 'director-statement');--> statement-breakpoint
CREATE TYPE "public"."script_status" AS ENUM('draft', 'available', 'sold', 'archived');--> statement-breakpoint
CREATE TYPE "public"."showcase_link_type" AS ENUM('none', 'script', 'external');--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "storage_provider" NOT NULL,
	"object_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum_sha256" char(64) NOT NULL,
	"visibility" "asset_visibility" DEFAULT 'private' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"request_id" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"external_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"direction" "ledger_direction" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"source" "ledger_source" NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"note" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "point_ledger_amount_positive" CHECK ("point_ledger"."amount" > 0),
	CONSTRAINT "point_ledger_balance_nonnegative" CHECK ("point_ledger"."balance_after" >= 0)
);
--> statement-breakpoint
CREATE TABLE "recharge_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recharge_no" text NOT NULL,
	"user_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"points" integer NOT NULL,
	"provider" text DEFAULT 'alipay' NOT NULL,
	"external_trade_no" text,
	"status" "recharge_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recharge_orders_amount_positive" CHECK ("recharge_orders"."amount_cents" > 0),
	CONSTRAINT "recharge_orders_points_positive" CHECK ("recharge_orders"."points" > 0)
);
--> statement-breakpoint
CREATE TABLE "script_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_no" text NOT NULL,
	"script_id" uuid NOT NULL,
	"buyer_user_id" text NOT NULL,
	"original_price_points" integer NOT NULL,
	"discount_basis_points" integer NOT NULL,
	"final_price_points" integer NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "script_orders_prices_nonnegative" CHECK ("script_orders"."original_price_points" >= 0 and "script_orders"."final_price_points" >= 0),
	CONSTRAINT "script_orders_discount_valid" CHECK ("script_orders"."discount_basis_points" between 1 and 10000)
);
--> statement-breakpoint
CREATE TABLE "invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"status" "invite_code_status" DEFAULT 'unused' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"used_by_user_id" text,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"discount_basis_points" integer DEFAULT 10000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_points_nonnegative" CHECK ("users"."points_balance" >= 0),
	CONSTRAINT "users_discount_valid" CHECK ("users"."discount_basis_points" between 1 and 10000)
);
--> statement-breakpoint
CREATE TABLE "script_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"script_id" uuid NOT NULL,
	"kind" "script_file_kind" NOT NULL,
	"asset_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_previews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"script_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"en" text NOT NULL,
	"zh" text NOT NULL,
	"format_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "script_previews_sequence_nonnegative" CHECK ("script_previews"."sequence" >= 0)
);
--> statement-breakpoint
CREATE TABLE "scripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"english_title" text,
	"genre" text NOT NULL,
	"logline" text NOT NULL,
	"synopsis" text NOT NULL,
	"director_statement" text NOT NULL,
	"director_sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preview_rationale" text,
	"source_unit_count" integer,
	"preview_unit_label" text DEFAULT '场' NOT NULL,
	"presentation_mode" "presentation_mode" NOT NULL,
	"package_mode" "package_mode" NOT NULL,
	"price_points" integer NOT NULL,
	"episodes" integer NOT NULL,
	"status" "script_status" DEFAULT 'draft' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"cover_asset_id" uuid,
	"sold_to_user_id" text,
	"sold_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_by_user_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scripts_price_nonnegative" CHECK ("scripts"."price_points" >= 0),
	CONSTRAINT "scripts_episodes_positive" CHECK ("scripts"."episodes" > 0),
	CONSTRAINT "scripts_version_positive" CHECK ("scripts"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "showcase_posters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"image_asset_id" uuid NOT NULL,
	"link_type" "showcase_link_type" DEFAULT 'none' NOT NULL,
	"linked_script_id" uuid,
	"external_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_orders" ADD CONSTRAINT "script_orders_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_orders" ADD CONSTRAINT "script_orders_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_used_by_user_id_users_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_files" ADD CONSTRAINT "script_files_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_files" ADD CONSTRAINT "script_files_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_previews" ADD CONSTRAINT "script_previews_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_cover_asset_id_media_assets_id_fk" FOREIGN KEY ("cover_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_sold_to_user_id_users_id_fk" FOREIGN KEY ("sold_to_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showcase_posters" ADD CONSTRAINT "showcase_posters_image_asset_id_media_assets_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showcase_posters" ADD CONSTRAINT "showcase_posters_linked_script_id_scripts_id_fk" FOREIGN KEY ("linked_script_id") REFERENCES "public"."scripts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_provider_key_unique" ON "media_assets" USING btree ("provider","object_key");--> statement-breakpoint
CREATE INDEX "media_assets_checksum_idx" ON "media_assets" USING btree ("checksum_sha256");--> statement-breakpoint
CREATE INDEX "media_assets_created_at_idx" ON "media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_created_idx" ON "audit_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_provider_event_unique" ON "payment_events" USING btree ("provider","external_event_id");--> statement-breakpoint
CREATE INDEX "point_ledger_user_created_idx" ON "point_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recharge_orders_number_unique" ON "recharge_orders" USING btree ("recharge_no");--> statement-breakpoint
CREATE UNIQUE INDEX "recharge_orders_external_trade_unique" ON "recharge_orders" USING btree ("external_trade_no") WHERE "recharge_orders"."external_trade_no" is not null;--> statement-breakpoint
CREATE INDEX "recharge_orders_user_created_idx" ON "recharge_orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "script_orders_order_no_unique" ON "script_orders" USING btree ("order_no");--> statement-breakpoint
CREATE UNIQUE INDEX "script_orders_completed_script_unique" ON "script_orders" USING btree ("script_id") WHERE "script_orders"."status" = 'completed';--> statement-breakpoint
CREATE INDEX "script_orders_buyer_created_idx" ON "script_orders" USING btree ("buyer_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_codes_code_unique" ON "invite_codes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_codes_used_by_unique" ON "invite_codes" USING btree ("used_by_user_id") WHERE "invite_codes"."used_by_user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "script_files_script_kind_unique" ON "script_files" USING btree ("script_id","kind");--> statement-breakpoint
CREATE INDEX "script_files_asset_idx" ON "script_files" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_previews_script_sequence_unique" ON "script_previews" USING btree ("script_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "scripts_slug_unique" ON "scripts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "scripts_status_published_idx" ON "scripts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "showcase_posters_published_order_idx" ON "showcase_posters" USING btree ("published","sort_order");