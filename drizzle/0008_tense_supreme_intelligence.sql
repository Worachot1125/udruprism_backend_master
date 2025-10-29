ALTER TABLE "Vote" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "Vote" CASCADE;--> statement-breakpoint
ALTER TABLE "User" DROP CONSTRAINT "User_DepartmentId_Department_id_fk";
--> statement-breakpoint
ALTER TABLE "Department" ALTER COLUMN "detail" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Faculty" ALTER COLUMN "detail" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "lastContext" jsonb;--> statement-breakpoint
ALTER TABLE "Model" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "TokenUsage" ADD COLUMN "reasoningTokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "TokenUsage" ADD COLUMN "cachedInputTokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_department_Department_id_fk" FOREIGN KEY ("department") REFERENCES "public"."Department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Model" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN "password";