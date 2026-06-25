-- 다중 Google Calendar watch 채널 추적용 컬럼 추가
-- 구조: { "<calendarId>": { "channelId": "...", "resourceId": "...", "expiration": "<ISO>" } }
-- 기존 google_channel_id / google_resource_id / google_channel_expiration 컬럼은
-- 기본(primary) 캘린더 하위호환 및 안전장치용으로 유지됩니다.
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS google_channels jsonb DEFAULT '{}'::jsonb;
