ALTER TABLE "Policy" DROP CONSTRAINT "Policy_name_unique";--> statement-breakpoint
ALTER TABLE "Admin" ADD COLUMN "department" varchar(250);--> statement-breakpoint
ALTER TABLE "Policy" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;