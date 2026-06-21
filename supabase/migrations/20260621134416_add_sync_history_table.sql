-- Create sync_history table
CREATE TABLE IF NOT EXISTS public.sync_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  google_event_id TEXT,           -- Google Calendar Event ID
  calendar_id TEXT NOT NULL,      -- Target Google Calendar ID
  calendar_name TEXT,             -- Snapshot of calendar name
  category_id UUID,               -- Reference to category ID
  category_name TEXT,             -- Snapshot of category name
  action TEXT NOT NULL,           -- 'CREATED' | 'UPDATED' | 'DELETED' | 'MIGRATED' | 'BATCH_SYNC' | 'ERROR'
  status TEXT NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS' | 'FAILED' | 'PENDING'
  activity_title TEXT,            -- Snapshot of activity title
  activity_start_time TIMESTAMPTZ,-- Snapshot of activity start time
  error_message TEXT,             -- Error message if failed
  metadata JSONB DEFAULT '{}',    -- Additional info
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sync history"
  ON public.sync_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync history"
  ON public.sync_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync history"
  ON public.sync_history FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_history_user ON public.sync_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_activity ON public.sync_history(activity_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_calendar ON public.sync_history(calendar_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_synced_at ON public.sync_history(synced_at DESC);
