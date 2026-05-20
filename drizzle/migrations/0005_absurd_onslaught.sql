CREATE TABLE "kitchen_reconciliation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reconciliation_id" uuid NOT NULL,
	"kitchen_stock_id" uuid,
	"product_id" uuid NOT NULL,
	"quantity_used" numeric(12, 4) NOT NULL,
	"quantity_waste" numeric(12, 4) DEFAULT '0' NOT NULL,
	"quantity_leftover" numeric(12, 4) DEFAULT '0' NOT NULL,
	"reason" text DEFAULT 'normal' NOT NULL,
	"reason_notes" text,
	"per_guest_used_stock" numeric(12, 6),
	"per_serving_used_stock" numeric(12, 6),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"service_date" date NOT NULL,
	"meal_type" text NOT NULL,
	"event_tag" text,
	"actual_guest_count" integer NOT NULL,
	"actual_servings" integer NOT NULL,
	"reorder_ratio" numeric(6, 3),
	"notes" text,
	"reported_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kitchen_reconciliation_items" ADD CONSTRAINT "kitchen_reconciliation_items_reconciliation_id_kitchen_reconciliations_id_fk" FOREIGN KEY ("reconciliation_id") REFERENCES "public"."kitchen_reconciliations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_reconciliation_items" ADD CONSTRAINT "kitchen_reconciliation_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_reconciliations" ADD CONSTRAINT "kitchen_reconciliations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_reconciliations" ADD CONSTRAINT "kitchen_reconciliations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reconciliation_items_product" ON "kitchen_reconciliation_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_reconciliation_items_recon" ON "kitchen_reconciliation_items" USING btree ("reconciliation_id");--> statement-breakpoint
CREATE INDEX "idx_reconciliations_branch_meal" ON "kitchen_reconciliations" USING btree ("branch_id","meal_type");--> statement-breakpoint
CREATE INDEX "idx_reconciliations_service_date" ON "kitchen_reconciliations" USING btree ("service_date");