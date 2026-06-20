ALTER TABLE public.activities
ADD COLUMN recurrence_rule TEXT,
ADD COLUMN parent_activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
ADD COLUMN original_start_time TIMESTAMP WITH TIME ZONE;
