-- 미러 세이프 재전송(FORCE) 작업 모드를 허용한다.
--
-- 배경:
--   네이버 캘린더처럼 구글을 **주기적으로 당겨 가는 단방향 미러**는, 구글 이벤트의
--   `updated` 타임스탬프가 바뀌어야만 그 일정을 다시 가져간다.
--   그런데 평소 배치 동기화는 `google_content_hash`가 같으면 구글 왕복 자체를 건너뛴다.
--   그래서 미러가 한 번 놓친 일정은 사용자가 "지금 동기화"를 몇 번을 눌러도
--   영원히 돌아오지 못한다(실측 2026-08-25: synced 0 / skipped 153).
--
--   FORCE 모드는 그 교착을 푸는 유일한 탈출구다. 건너뛰기 없이 모든 일정을
--   `events.update`로 다시 보내 `updated`만 갱신한다.
--   삭제(events.delete)나 재생성(events.insert)을 하지 않으므로,
--   진행 중에 미러가 폴링하더라도 일정이 사라지는 순간이 존재하지 않는다.
--
-- 이 제약을 풀지 않으면 FORCE 작업 INSERT가 CHECK 위반으로 거부되어
-- "동기화 작업을 생성하지 못했습니다"만 뜨고 아무 일도 일어나지 않는다.

ALTER TABLE public.google_sync_jobs
  DROP CONSTRAINT IF EXISTS google_sync_jobs_mode_check;

ALTER TABLE public.google_sync_jobs
  ADD CONSTRAINT google_sync_jobs_mode_check
  CHECK (mode IN ('FULL', 'RETRY', 'FORCE'));

COMMENT ON COLUMN public.google_sync_jobs.mode IS
  'FULL: 전체 내보내기(변경분만) / RETRY: 실패 항목 재시도 / FORCE: 미러 세이프 전체 재전송(건너뛰기 없음, 삭제 없음)';
