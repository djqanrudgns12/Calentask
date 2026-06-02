-- Add missing columns to agenda_tasks
ALTER TABLE public.agenda_tasks 
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- We don't need memo because we already have description. But to match the frontend state exactly, we can rename description to memo or just use description as memo. 
-- Since the front-end uses memo, let's just add it if description is confusing, but description is fine. Let's add memo and drop description to match exact TS interface, or just map it in actions.
-- Let's use `memo` to exactly match the frontend `AgendaTask` interface.
ALTER TABLE public.agenda_tasks
ADD COLUMN IF NOT EXISTS memo TEXT;

-- We don't need description anymore, but maybe it's fine to leave it.
-- Let's just use memo.

-- Create agenda_subtasks table
CREATE TABLE IF NOT EXISTS public.agenda_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.agenda_tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.agenda_subtasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own agenda subtasks" 
ON public.agenda_subtasks 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.agenda_tasks
        WHERE agenda_tasks.id = agenda_subtasks.task_id
        AND agenda_tasks.user_id = auth.uid()
    )
);

-- Function to auto delete old trash
CREATE OR REPLACE FUNCTION delete_old_trash_agenda_tasks()
RETURNS void AS $$
BEGIN
    DELETE FROM public.agenda_tasks
    WHERE status = 'trash' AND deleted_at < NOW() - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
