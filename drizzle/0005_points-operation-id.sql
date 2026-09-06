ALTER TABLE "point_ledger" ADD COLUMN "operation_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "point_ledger_operation_unique" ON "point_ledger" USING btree ("operation_id");