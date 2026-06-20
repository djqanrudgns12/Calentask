ALTER TABLE users 
ADD COLUMN google_sync_settings jsonb DEFAULT '{}'::jsonb;
