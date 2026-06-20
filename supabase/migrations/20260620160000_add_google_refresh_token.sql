-- Add google_refresh_token for Google OAuth integration
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
