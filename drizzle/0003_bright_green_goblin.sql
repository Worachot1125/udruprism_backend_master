CREATE TABLE "Model" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelId" varchar(250) NOT NULL,
	"name" varchar(250) NOT NULL,
	"description" text
);
