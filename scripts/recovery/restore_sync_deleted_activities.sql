-- ════════════════════════════════════════════════════════════════
-- 동기화 버그로 휴지통에 들어간 일정 복구
--
-- 원인: 구글에서 '중복 사본 정리'로 지워진 옛 이벤트의 tombstone이 웹훅으로
--       돌아왔을 때, 같은 calentask_id 태그만 보고 원본 활동을 soft-delete 했다.
--       (활동은 다른 살아있는 이벤트에 연결돼 있었는데도 삭제됨)
--
-- 데이터는 지워지지 않았다. deleted_at만 설정된 상태다.
--
-- ⚠️ 순서를 지켜야 한다. 아래 [주의] 참고.
-- ════════════════════════════════════════════════════════════════
--
-- [주의] soft-delete가 google_event_id / google_calendar_id 까지 비워 놨다.
--        그래서 복구만 하고 바로 동기화하면 앱이 "구글에 없는 일정"으로 판단해
--        전부 새로 만들어 **중복**이 생긴다.
--
--        수정된 코드의 '연결 복구(reconcile)' 패스가 구글에 남아 있는 실물을 스캔해
--        끊어진 링크를 되살린다. 따라서 반드시 이 순서로 진행할 것:
--
--          1) 수정된 코드 배포
--          2) 이 스크립트로 복구         ← deleted_at 해제
--          3) 앱에서 '즉시 동기화' 1회   ← 링크 자동 복구 + 중복 제거
--
-- ────────────────────────────────────────────────────────────────
-- [1단계] 무엇이 복구될지 먼저 확인 (읽기 전용)
--   :user_id 를 본인 UUID로 바꾸고, 시간 범위는 동기화를 돌린 시점에 맞춰 조정.
-- ────────────────────────────────────────────────────────────────
SELECT
  count(*) AS "복구 대상 건수",
  min(deleted_at) AS "가장 이른 삭제 시각",
  max(deleted_at) AS "가장 늦은 삭제 시각"
FROM public.activities
WHERE user_id = :'user_id'
  AND deleted_at IS NOT NULL
  AND deleted_at > now() - interval '48 hours';

-- 목록도 눈으로 확인
SELECT id, title, start_time, deleted_at, google_event_id
FROM public.activities
WHERE user_id = :'user_id'
  AND deleted_at IS NOT NULL
  AND deleted_at > now() - interval '48 hours'
ORDER BY deleted_at DESC, start_time DESC;

-- ────────────────────────────────────────────────────────────────
-- [2단계] 위 목록이 맞으면 주석을 풀고 실행
--
--   google_content_hash 를 비우는 이유:
--   다음 동기화가 이 일정들을 "변경 없음"으로 건너뛰지 않고 반드시 다시 확인하도록.
-- ────────────────────────────────────────────────────────────────
-- UPDATE public.activities
-- SET deleted_at = NULL,
--     google_content_hash = NULL
-- WHERE user_id = :'user_id'
--   AND deleted_at IS NOT NULL
--   AND deleted_at > now() - interval '48 hours';
