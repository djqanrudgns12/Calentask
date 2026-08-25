-- 잘못된 google_calendar_id 백필 되돌리기.
--
-- 20260825000000 초안에는 "구글과 연결된 일정은 모두 google_sync_calendar_id에 있을 것"이라고
-- 추측해 채우는 UPDATE가 들어 있었다. 그 결과 '그룹 및 라우팅'으로 다른 캘린더에 분배돼야 할
-- 일정까지 전부 기본 동기화 캘린더를 가리키게 됐고, push 로직이 그 값을 목적지로 우선하는
-- 바람에 고급 설정을 아무리 바꿔도 반영되지 않았다.
--
-- 이제 push는 목적지를 오직 설정(groupMapping → 기본 쓰기 캘린더)으로만 결정하고,
-- google_calendar_id는 '지금 어디에 있는지'를 찾는 힌트로만 쓴다.
-- 추측으로 채워진 값은 비워서, 첫 push가 실제 위치를 탐색해 정확히 채우도록 한다.
--
-- 판별 기준: 기본 동기화 캘린더를 가리키면서 아직 한 번도 실제 push로 확인된 적이 없는 행
-- (google_synced_at IS NULL). 실제 push를 거친 행은 관측값이므로 건드리지 않는다.
UPDATE public.activities a
SET google_calendar_id = NULL
FROM public.users u
WHERE a.user_id = u.id
  AND a.google_synced_at IS NULL
  AND a.google_calendar_id IS NOT NULL
  AND a.google_calendar_id = u.google_sync_calendar_id;
