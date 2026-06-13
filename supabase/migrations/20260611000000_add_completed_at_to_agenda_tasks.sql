ALTER TABLE "public"."agenda_tasks" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
