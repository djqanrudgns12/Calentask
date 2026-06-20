-- Add fields for Google Calendar synchronization
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_channel_id TEXT,
ADD COLUMN IF NOT EXISTS google_resource_id TEXT,
ADD COLUMN IF NOT EXISTS google_channel_expiration TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_sync_token TEXT;

-- Add index for fast channel_id lookup
CREATE INDEX IF NOT EXISTS idx_users_google_channel_id ON public.users(google_channel_id);
