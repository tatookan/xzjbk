CREATE TABLE "recharge_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"base_points" integer NOT NULL,
	"bonus_points" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recharge_plans_amount_positive" CHECK ("recharge_plans"."amount_cents" > 0),
	CONSTRAINT "recharge_plans_base_rate_fixed" CHECK ("recharge_plans"."base_points" = "recharge_plans"."amount_cents"),
	CONSTRAINT "recharge_plans_bonus_nonnegative" CHECK ("recharge_plans"."bonus_points" >= 0),
	CONSTRAINT "recharge_plans_max_discount" CHECK (("recharge_plans"."base_points" + "recharge_plans"."bonus_points") * 2 <= "recharge_plans"."amount_cents" * 5)
);
--> statement-breakpoint
INSERT INTO "recharge_plans" ("name", "amount_cents", "base_points", "bonus_points", "sort_order") VALUES
	('轻量补充', 10000, 10000, 0, 10),
	('创作加速', 30000, 30000, 7500, 20),
	('项目储备', 60000, 60000, 40000, 30),
	('制作中心', 100000, 100000, 150000, 40);
--> statement-breakpoint
ALTER TABLE "script_orders" RENAME COLUMN "final_price_points" TO "price_points";--> statement-breakpoint
ALTER TABLE "script_orders" DROP CONSTRAINT "script_orders_prices_nonnegative";--> statement-breakpoint
ALTER TABLE "script_orders" DROP CONSTRAINT "script_orders_discount_valid";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_discount_valid";--> statement-breakpoint
ALTER TABLE "recharge_orders" ADD COLUMN "recharge_plan_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "recharge_orders" ADD COLUMN "base_points" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "recharge_orders" ADD COLUMN "bonus_points" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "recharge_plans_amount_unique" ON "recharge_plans" USING btree ("amount_cents");--> statement-breakpoint
CREATE INDEX "recharge_plans_active_sort_idx" ON "recharge_plans" USING btree ("is_active","sort_order");--> statement-breakpoint
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_recharge_plan_id_recharge_plans_id_fk" FOREIGN KEY ("recharge_plan_id") REFERENCES "public"."recharge_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_orders" DROP COLUMN "original_price_points";--> statement-breakpoint
ALTER TABLE "script_orders" DROP COLUMN "discount_basis_points";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "discount_basis_points";--> statement-breakpoint
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_base_rate_fixed" CHECK ("recharge_orders"."base_points" = "recharge_orders"."amount_cents");--> statement-breakpoint
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_bonus_nonnegative" CHECK ("recharge_orders"."bonus_points" >= 0);--> statement-breakpoint
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_points_match" CHECK ("recharge_orders"."points" = "recharge_orders"."base_points" + "recharge_orders"."bonus_points");--> statement-breakpoint
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_max_discount" CHECK ("recharge_orders"."points" * 2 <= "recharge_orders"."amount_cents" * 5);--> statement-breakpoint
ALTER TABLE "script_orders" ADD CONSTRAINT "script_orders_price_positive" CHECK ("script_orders"."price_points" > 0);
