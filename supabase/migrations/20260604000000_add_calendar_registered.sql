-- Add calendar registration status column to agenda_tasks
ALTER TABLE "public"."agenda_tasks" ADD COLUMN "is_calendar_registered" boolean DEFAULT false NOT NULL;
