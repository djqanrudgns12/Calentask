-- 구글 캘린더 내보내기(배치 push)를 서버 주도 작업으로 전환하기 위한 테이블.
--
-- 기존에는 브라우저가 오케스트레이터였다. 모달의 while 루프가 청크를 하나씩 fetch 했기 때문에
-- 모달을 닫거나 화면을 벗어나면 AbortController가 발동해 동기화가 그 자리에서 죽었다.
-- 이제 서버가 작업 전체를 진행하고, 이 행이 진행 상황의 단일 진실 공급원이 된다.
-- 클라이언트는 Realtime으로 이 행을 구독만 하므로 언제 닫아도 작업은 계속된다.

CREATE TABLE IF NOT EXISTS public.google_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- FULL: 전체 일정 내보내기 / RETRY: 실패 항목만 재시도
  mode text NOT NULL DEFAULT 'FULL',
  -- RUNNING: 진행 중 / PAUSED: 실행 시간 한도로 중단(이어하기 가능)
  -- SUCCEEDED / FAILED / CANCELLED
  status text NOT NULL DEFAULT 'RUNNING',

  total integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  synced integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  task_skipped integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,

  -- 다음에 처리할 offset. PAUSED 상태에서 이어하기의 기준점.
  cursor integer NOT NULL DEFAULT 0,
  -- RETRY 모드에서 처리할 활동 ID 목록
  activity_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  failed_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 최근 처리 로그(꼬리 N건만 유지). UI 피드용.
  recent_log jsonb NOT NULL DEFAULT '[]'::jsonb,

  error_message text,
  -- 실행 중인 서버리스 인스턴스가 살아있음을 알리는 신호.
  -- 오래된 heartbeat = 인스턴스가 죽음 → 이어하기 대상으로 판단한다.
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT google_sync_jobs_mode_check CHECK (mode IN ('FULL', 'RETRY')),
  CONSTRAINT google_sync_jobs_status_check
    CHECK (status IN ('RUNNING', 'PAUSED', 'SUCCEEDED', 'FAILED', 'CANCELLED'))
);

-- "이 사용자의 최신 작업"을 뽑는 것이 거의 모든 조회 패턴이다.
CREATE INDEX IF NOT EXISTS idx_google_sync_jobs_user_created
  ON public.google_sync_jobs (user_id, created_at DESC);

-- 아직 끝나지 않은 작업 탐색(중복 실행 방지 / 이어하기)
CREATE INDEX IF NOT EXISTS idx_google_sync_jobs_active
  ON public.google_sync_jobs (user_id, status)
  WHERE status IN ('RUNNING', 'PAUSED');

CREATE TRIGGER on_google_sync_jobs_updated
  BEFORE UPDATE ON public.google_sync_jobs
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- RLS: 본인 작업만 조회/취소할 수 있다. 작업 실행은 서버(service role)가 하므로
-- INSERT/UPDATE 정책은 두지 않는다(service role은 RLS를 우회한다).
ALTER TABLE public.google_sync_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sync jobs." ON public.google_sync_jobs;
CREATE POLICY "Users can view own sync jobs."
  ON public.google_sync_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- 진행 상황을 WebSocket으로 흘려보내 클라이언트가 폴링 없이 따라오게 한다.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'google_sync_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.google_sync_jobs;
  END IF;
END
$$;

-- UPDATE 이벤트에서 행을 온전히 식별할 수 있도록 (RLS 필터링에도 필요)
ALTER TABLE public.google_sync_jobs REPLICA IDENTITY FULL;
