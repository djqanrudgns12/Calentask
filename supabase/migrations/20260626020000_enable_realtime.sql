-- 실시간(Realtime) 발행 활성화
-- 아래 테이블의 변경(INSERT/UPDATE/DELETE)이 WebSocket으로 클라이언트에 브로드캐스트되어,
-- 다른 기기 입력이나 외부 동기화(구글 웹훅 등)가 수동 새로고침 없이 자동 반영되도록 한다.
-- (클라이언트 구독: src/components/calendar/CalendarClient.tsx 의 db_realtime 채널)
--
-- RLS가 켜져 있으므로 각 클라이언트는 자신의 행 변경만 수신한다.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'activities',
    'activity_category_map',
    'categories',
    'anniversaries',
    'agenda_tasks',
    'agenda_subtasks',
    'notes',
    'archive_tabs',
    'link_lounge_bookmarks',
    'link_lounge_categories'
  ];
BEGIN
  -- supabase_realtime publication은 Supabase가 기본 제공하지만, 없을 경우를 대비한 안전장치
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- 이미 등록된 테이블은 건너뛰고, 누락된 테이블만 publication에 추가 (멱등)
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$$;

-- DELETE/UPDATE 이벤트에서 행을 온전히 식별할 수 있도록 REPLICA IDENTITY FULL 설정
ALTER TABLE public.activities REPLICA IDENTITY FULL;
ALTER TABLE public.activity_category_map REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.anniversaries REPLICA IDENTITY FULL;
ALTER TABLE public.agenda_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.agenda_subtasks REPLICA IDENTITY FULL;
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER TABLE public.archive_tabs REPLICA IDENTITY FULL;
ALTER TABLE public.link_lounge_bookmarks REPLICA IDENTITY FULL;
ALTER TABLE public.link_lounge_categories REPLICA IDENTITY FULL;
