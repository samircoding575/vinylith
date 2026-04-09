CREATE TYPE "public"."condition" AS ENUM('mint', 'near_mint', 'good', 'fair', 'poor');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('book', 'toy', 'notebook', 'vinyl');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('member', 'librarian', 'admin');--> statement-breakpoint
CREATE TABLE "borrowings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"borrowed_at" timestamp DEFAULT now() NOT NULL,
	"due_at" timestamp NOT NULL,
	"returned_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "condition_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"condition" "condition" NOT NULL,
	"notes" text,
	"logged_by" uuid,
	"logged_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "item_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"condition" "condition" DEFAULT 'good' NOT NULL,
	"image_url" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "borrowings" ADD CONSTRAINT "borrowings_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrowings" ADD CONSTRAINT "borrowings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_logs" ADD CONSTRAINT "condition_logs_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_logs" ADD CONSTRAINT "condition_logs_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;