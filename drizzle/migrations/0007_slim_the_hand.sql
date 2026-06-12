CREATE INDEX "idx_branch_members_user" ON "branch_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_branches_company" ON "branches" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_invite_tokens_company" ON "invite_tokens" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_product_suppliers_product" ON "product_suppliers" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_products_branch" ON "products" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_shopping_list_items_list" ON "shopping_list_items" USING btree ("shopping_list_id");--> statement-breakpoint
CREATE INDEX "idx_shopping_list_items_product" ON "shopping_list_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_shopping_lists_branch_status" ON "shopping_lists" USING btree ("branch_id","status");