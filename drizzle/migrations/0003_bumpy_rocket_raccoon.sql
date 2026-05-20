CREATE TABLE "dish_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dish_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_per_serving" numeric(10, 4) NOT NULL,
	"unit" text DEFAULT 'base' NOT NULL,
	"is_substitutable" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_servings_per_guest" numeric(10, 4) DEFAULT '1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"meal_type" text NOT NULL,
	"event_tag" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_stock" numeric(12, 4) NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"best_before" date,
	"source_transaction_id" uuid,
	"is_depleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dish_ingredients" ADD CONSTRAINT "dish_ingredients_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_ingredients" ADD CONSTRAINT "dish_ingredients_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dish_ingredients_dish" ON "dish_ingredients" USING btree ("dish_id");--> statement-breakpoint
CREATE INDEX "idx_dish_ingredients_product" ON "dish_ingredients" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_dishes_menu" ON "dishes" USING btree ("menu_id");--> statement-breakpoint
CREATE INDEX "idx_menus_branch" ON "menus" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_menus_meal_type" ON "menus" USING btree ("meal_type");--> statement-breakpoint
CREATE INDEX "idx_batches_product_branch" ON "product_batches" USING btree ("product_id","branch_id");--> statement-breakpoint
CREATE INDEX "idx_batches_best_before" ON "product_batches" USING btree ("best_before");--> statement-breakpoint
CREATE INDEX "idx_batches_active" ON "product_batches" USING btree ("is_depleted");