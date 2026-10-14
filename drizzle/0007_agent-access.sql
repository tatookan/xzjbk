CREATE TYPE "public"."agent_api_key_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."agent_import_status" AS ENUM('processing', 'committed', 'failed');--> statement-breakpoint
CREATE TABLE "agent_access_grants" (
	"user_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"granted_by_user_id" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_prefix" varchar(24) NOT NULL,
	"key_hash" char(64) NOT NULL,
	"status" "agent_api_key_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"last_used_ip" varchar(64),
	"last_skill_version" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "agent_api_rate_limits" (
	"api_key_id" uuid NOT NULL,
	"scope" varchar(64) NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_api_rate_limits_api_key_id_scope_window_started_at_pk" PRIMARY KEY("api_key_id","scope","window_started_at")
);
--> statement-breakpoint
CREATE TABLE "agent_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"api_key_id" uuid NOT NULL,
	"idempotency_key" varchar(100) NOT NULL,
	"status" "agent_import_status" DEFAULT 'processing' NOT NULL,
	"script_id" uuid,
	"request_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_access_grants" ADD CONSTRAINT "agent_access_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_access_grants" ADD CONSTRAINT "agent_access_grants_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_api_keys" ADD CONSTRAINT "agent_api_keys_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_api_keys" ADD CONSTRAINT "agent_api_keys_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_api_rate_limits" ADD CONSTRAINT "agent_api_rate_limits_api_key_id_agent_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."agent_api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_imports" ADD CONSTRAINT "agent_imports_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_imports" ADD CONSTRAINT "agent_imports_api_key_id_agent_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."agent_api_keys"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_imports" ADD CONSTRAINT "agent_imports_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_access_grants_enabled_idx" ON "agent_access_grants" USING btree ("enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_api_keys_prefix_unique" ON "agent_api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_api_keys_hash_unique" ON "agent_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "agent_api_keys_owner_status_idx" ON "agent_api_keys" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE INDEX "agent_api_keys_expires_idx" ON "agent_api_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_imports_owner_idempotency_unique" ON "agent_imports" USING btree ("owner_user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "agent_imports_owner_created_idx" ON "agent_imports" USING btree ("owner_user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_imports_status_created_idx" ON "agent_imports" USING btree ("status","created_at");