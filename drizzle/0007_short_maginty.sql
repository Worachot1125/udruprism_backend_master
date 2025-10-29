CREATE TYPE "public"."role_enum" AS ENUM('บุคลากรสายวิชาการ', 'บุคลากรสายสนับสนุน', 'บุคลากรภายนอก', 'นักศึกษา');--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "role" "role_enum";--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN "is_active";