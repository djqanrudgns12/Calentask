-- 월간 캘린더의 사용자·날짜 범위 조회를 위한 부분 인덱스입니다.
-- 기존 Google 동기화 마이그레이션과 독립적으로 적용합니다.

CREATE INDEX IF NOT EXISTS idx_activities_calendar_month_range
  ON public.activities (user_id, start_time, end_time)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_activities_calendar_recurring_masters
  ON public.activities (user_id, start_time)
  WHERE deleted_at IS NULL AND recurrence_rule IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_calendar_recurring_exceptions
  ON public.activities (user_id, original_start_time, start_time)
  WHERE parent_activity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agenda_tasks_calendar_month
  ON public.agenda_tasks (user_id, deadline)
  WHERE is_calendar_registered = true
    AND deleted_at IS NULL
    AND status <> 'trash';
