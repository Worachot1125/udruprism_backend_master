CREATE TABLE "Ban" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid,
	"reason" text,
	"start_at" timestamp DEFAULT now() NOT NULL,
	"end_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_group_id_Policy_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."Policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_groupId_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."Policy"("id") ON DELETE set null ON UPDATE no action;