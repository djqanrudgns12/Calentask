ALTER TABLE activities ADD COLUMN reminders JSONB DEFAULT '[]'::jsonb;
