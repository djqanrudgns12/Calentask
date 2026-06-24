-- Add NEIS school fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS neis_office_code text,
ADD COLUMN IF NOT EXISTS neis_school_code text,
ADD COLUMN IF NOT EXISTS neis_school_name text;
