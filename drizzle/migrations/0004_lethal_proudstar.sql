CREATE TABLE "kitchen_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_issued" numeric(12, 4) NOT NULL,
	"quantity_remaining" numeric(12, 4) NOT NULL,
	"expected_guest_count" integer,
	"expected_servings" integer,
	"menu_id" uuid,
	"event_tag" text,
	"source_transaction_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"reconciled_at" timestamp,
	"notes" text,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "kitchen_stock" ADD CONSTRAINT "kitchen_stock_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_stock" ADD CONSTRAINT "kitchen_stock_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_stock" ADD CONSTRAINT "kitchen_stock_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_kitchen_stock_branch_status" ON "kitchen_stock" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX "idx_kitchen_stock_product" ON "kitchen_stock" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_kitchen_stock_issued_at" ON "kitchen_stock" USING btree ("issued_at");