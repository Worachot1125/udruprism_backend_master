CREATE TABLE "Admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	"prefix" "prefix_enum",
	"firstname" varchar(250),
	"lastname" varchar(250)
);
--> statement-breakpoint
CREATE TABLE "PolicyModelMap" (
	"policyId" uuid DEFAULT gen_random_uuid(),
	"modelId" uuid DEFAULT gen_random_uuid(),
	CONSTRAINT "PolicyModelMap_policyId_modelId_pk" PRIMARY KEY("policyId","modelId")
);
--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "description" varchar(255);--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE "Policy" ADD COLUMN "default_token_limit" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Policy" ADD COLUMN "default_model" varchar(250) DEFAULT 'google/gemini-2.5-pro';--> statement-breakpoint
ALTER TABLE "PolicyModelMap" ADD CONSTRAINT "PolicyModelMap_policyId_Policy_id_fk" FOREIGN KEY ("policyId") REFERENCES "public"."Policy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PolicyModelMap" ADD CONSTRAINT "PolicyModelMap_modelId_Model_id_fk" FOREIGN KEY ("modelId") REFERENCES "public"."Model"("id") ON DELETE cascade ON UPDATE no action;