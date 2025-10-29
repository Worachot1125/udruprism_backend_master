ALTER TABLE "Ban" RENAME COLUMN "group_id" TO "policy_id";--> statement-breakpoint
ALTER TABLE "Ban" DROP CONSTRAINT "Ban_group_id_Policy_id_fk";
--> statement-breakpoint
ALTER TABLE "Ban" DROP CONSTRAINT "Ban_groupId_fkey";
--> statement-breakpoint
ALTER TABLE "Ban" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_policy_id_Policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."Policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_policyId_fkey" FOREIGN KEY ("policy_id") REFERENCES "public"."Policy"("id") ON DELETE set null ON UPDATE no action;