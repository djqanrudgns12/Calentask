-- Google 캘린더 양방향 동기화 강화
--
-- 배경: 상관(correlation) 키가 Google 이벤트의 extendedProperties.private.calentask_id
-- 하나뿐이라, 네이버 캘린더처럼 구글을 미러링하는 서드파티가 이벤트를 재생성하면서
-- 확장 속성을 떨어뜨리면 Calentask ↔ Google 연결이 통째로 끊겼다.
-- 또한 "이 이벤트를 마지막으로 어느 시점까지 반영했는가"를 기록할 곳이 없어,
-- activities.updated_at(트리거가 항상 now()로 덮어씀)에 의존하다 에코 루프가 발생했다.
--
--  1) google_calendar_id : 이벤트가 실제로 존재하는 캘린더 ID.
--                          기존에는 sync_history를 활동마다 역추적(N+1)해서 알아냈다.
--  2) google_ical_uid    : 캘린더 간 복사·서드파티 브리지를 넘나들어도 보존되는 안정 키.
--  3) google_synced_at   : 마지막으로 반영한 Google 이벤트의 updated 시각(구글 시계 기준).
--                          우리 push가 되돌아온 웹훅(에코)을 무시하는 기준점이 된다.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS google_calendar_id text,
  ADD COLUMN IF NOT EXISTS google_ical_uid    text,
  ADD COLUMN IF NOT EXISTS google_synced_at   timestamptz;

-- 델타 반영 시 이벤트 ID / iCalUID로 활동을 벌크 역조회한다.
-- user_id를 선두 컬럼으로 두어 테넌트 스코프 조회가 인덱스를 그대로 탄다.
CREATE INDEX IF NOT EXISTS idx_activities_user_google_event
  ON public.activities (user_id, google_event_id)
  WHERE google_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_user_ical_uid
  ON public.activities (user_id, google_ical_uid)
  WHERE google_ical_uid IS NOT NULL;

-- 지문(제목 + 시작시각) 폴백 매칭용.
-- 서드파티가 이벤트를 새 ID로 재생성해 확장 속성·ID 상관이 모두 끊겼을 때,
-- "아직 구글과 연결되지 않은 활성 일정" 중에서만 후보를 찾아 중복 생성을 막는다.
CREATE INDEX IF NOT EXISTS idx_activities_unlinked_start
  ON public.activities (user_id, start_time)
  WHERE google_event_id IS NULL AND deleted_at IS NULL;

-- 반복 예외(자식 행) 조회용. Google이 보낸 예외 인스턴스를 회차 단위로 매칭한다.
CREATE INDEX IF NOT EXISTS idx_activities_parent_original_start
  ON public.activities (parent_activity_id, original_start_time)
  WHERE parent_activity_id IS NOT NULL;

-- 백필하지 않는다.
--
-- 초안에서는 "이미 연결된 일정은 google_sync_calendar_id에 있을 것"이라고 추측해 채웠는데,
-- 그룹 및 라우팅으로 다른 캘린더에 분배된 일정까지 전부 기본 동기화 캘린더로 표시해 버렸다.
-- google_calendar_id는 '지금 어디에 있는가'를 나타내는 관측값이지 추측할 값이 아니다.
-- 비워 두면 첫 push에서 실제 위치를 탐색해 정확한 값으로 채워진다.
