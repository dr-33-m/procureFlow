CREATE TABLE "product_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_id" uuid,
	"price_per_stock_unit" numeric(10, 4) NOT NULL,
	"source" text DEFAULT 'receive' NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_suppliers" ADD COLUMN "price_unit" text DEFAULT 'stock' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_suppliers" ADD COLUMN "lead_time_days" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "par_per_guest_unit" text DEFAULT 'stock';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "lead_time_days" integer;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD COLUMN "requested_unit" text DEFAULT 'stock';--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD COLUMN "expected_daily_occupancy" integer;--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD COLUMN "period_days" integer;--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD COLUMN "meals_per_day_count" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_supplier_id_product_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."product_suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_price_history_product" ON "product_price_history" USING btree ("product_id");