ALTER TABLE "User" DROP CONSTRAINT "User_policyId_Policy_id_fk";
--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_policyId_Policy_id_fk" FOREIGN KEY ("policyId") REFERENCES "public"."Policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_name_unique" UNIQUE("name");