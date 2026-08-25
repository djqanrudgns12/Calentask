-- ════════════════════════════════════════════════════════════════
--  진단 — 로그인 이메일은 @calentask.com 형식이다.
--  구글 연동 이메일(@gmail.com)이 아니라 이쪽으로 찾아야 한다.
-- ════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────
-- [A] 내 계정 찾기
--     public.users.google_email 로 구글 연동 계정을 역추적한다.
-- ───────────────────────────────────────────────
SELECT
  u.id            AS "user_id",
  au.email        AS "로그인 이메일",
  u.google_email  AS "구글 연동 이메일",
  u.google_sync_calendar_id  AS "동기화 캘린더",
  u.google_sync_calendar_name AS "캘린더 이름"
FROM public.users u
JOIN auth.users au ON au.id = u.id
WHERE u.google_email = 'djqanrudgns12@gmail.com';


-- ───────────────────────────────────────────────
-- [B] 사용자별 활동 건수 — 어느 계정에 데이터가 있는지 한눈에
-- ───────────────────────────────────────────────
SELECT
  a.user_id,
  au.email                                          AS "로그인 이메일",
  count(*)                                          AS "전체",
  count(*) FILTER (WHERE a.deleted_at IS NULL)      AS "살아있음",
  count(*) FILTER (WHERE a.deleted_at IS NOT NULL)  AS "휴지통",
  count(*) FILTER (WHERE a.google_event_id IS NOT NULL) AS "구글연결"
FROM public.activities a
JOIN auth.users au ON au.id = a.user_id
GROUP BY a.user_id, au.email
ORDER BY count(*) DESC;
