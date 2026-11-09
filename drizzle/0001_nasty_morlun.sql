ALTER TABLE "appointments" ADD COLUMN "visitor_id" varchar(64);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "is_demo_seed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "appointment_visitor_idx" ON "appointments" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "appointment_demo_seed_idx" ON "appointments" USING btree ("is_demo_seed");