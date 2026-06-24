-- Add neis_schools_config to support multiple schools in the dashboard
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS neis_schools_config jsonb DEFAULT '[]'::jsonb;
