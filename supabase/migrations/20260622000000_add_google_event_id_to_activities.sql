-- Add google_event_id column to activities table for sync history tracking
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Index for fast lookup in sync history tree (only non-null values)
CREATE INDEX IF NOT EXISTS idx_activities_google_event_id 
ON public.activities(google_event_id) WHERE google_event_id IS NOT NULL;
