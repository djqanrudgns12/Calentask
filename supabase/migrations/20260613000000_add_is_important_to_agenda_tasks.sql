-- Add is_important column to agenda_tasks
ALTER TABLE public.agenda_tasks ADD COLUMN is_important BOOLEAN NOT NULL DEFAULT false;
