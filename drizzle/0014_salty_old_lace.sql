CREATE TABLE "SuggestAction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255),
	"label" varchar(255),
	"action" text,
	"publish" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
