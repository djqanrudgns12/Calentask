-- ════════════════════════════════════════════════════════════════
--  동기화 버그로 휴지통에 들어간 일정 복구
--  Supabase Dashboard → SQL Editor 에 그대로 붙여넣어 실행하세요.
--
--  아래 이메일만 본인 것으로 바꾸면 됩니다. (UUID 찾을 필요 없음)
-- ════════════════════════════════════════════════════════════════
--
--  ⚠️ 반드시 이 순서로:
--     1) 수정된 코드 배포
--     2) 이 스크립트 [1]~[3] 실행
--     3) 앱에서 '즉시 동기화' 1회  ← 구글 링크 자동 복구 + 중복 정리
--
--  2번을 1번보다 먼저 하면 일정이 두 개씩 생깁니다.
-- ════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────
-- [1] 삭제 시각별로 묶어서 보기  ← 먼저 여기부터 실행
--
--     동기화가 지운 일정들은 **완전히 동일한 deleted_at** 을 공유합니다
--     (한 번의 배치가 하나의 타임스탬프로 지우기 때문).
--     반면 사용자가 직접 지운 것들은 시각이 제각각입니다.
--     → 건수가 수십~수백 개로 뭉쳐 있는 행이 이번 사고의 배치입니다.
-- ───────────────────────────────────────────────────────────────
SELECT
  deleted_at                AS "삭제 시각",
  count(*)                  AS "건수",
  min(title)                AS "예시 제목",
  count(*) FILTER (WHERE google_event_id IS NULL) AS "구글링크 끊김"
FROM public.activities
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'djqanrudgns12@gmail.com')
  AND deleted_at IS NOT NULL
GROUP BY deleted_at
ORDER BY count(*) DESC, deleted_at DESC
LIMIT 20;


-- ───────────────────────────────────────────────────────────────
-- [2] 위에서 찾은 타임스탬프의 실제 목록 확인
--     아래 '2026-08-25 12:34:56.789+00' 를 [1]에서 본 값으로 교체
-- ───────────────────────────────────────────────────────────────
SELECT id, title, start_time, google_event_id, google_calendar_id
FROM public.activities
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'djqanrudgns12@gmail.com')
  AND deleted_at = '2026-08-25 12:34:56.789+00'::timestamptz
ORDER BY start_time DESC;


-- ───────────────────────────────────────────────────────────────
-- [3] 목록이 맞으면 복구 실행
--     같은 타임스탬프로 교체한 뒤 실행하세요.
--
--     google_content_hash 를 비우는 이유:
--     다음 동기화가 "변경 없음"으로 건너뛰지 않고 반드시 다시 확인하도록.
-- ───────────────────────────────────────────────────────────────
UPDATE public.activities
SET deleted_at = NULL,
    google_content_hash = NULL
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'djqanrudgns12@gmail.com')
  AND deleted_at = '2026-08-25 12:34:56.789+00'::timestamptz;


-- ───────────────────────────────────────────────────────────────
-- [대안] 타임스탬프를 고르기 어렵다면: 최근 N시간 내 삭제분 전체 복구
--        (직접 지운 일정도 함께 되살아날 수 있으니 [1]에서 확인 후 사용)
-- ───────────────────────────────────────────────────────────────
-- UPDATE public.activities
-- SET deleted_at = NULL,
--     google_content_hash = NULL
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'djqanrudgns12@gmail.com')
--   AND deleted_at > now() - interval '48 hours';
