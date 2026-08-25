-- "이미 최신이라 건너뜀"을 판정하기 위한 콘텐츠 해시.
--
-- 배치 내보내기의 '건너뜀' 카운터는 지금까지 늘 0이었다. 값을 세는 코드가 아예 없었고,
-- 판정할 근거도 없어서 매번 154건 전부를 구글에 다시 써 올렸다.
--
-- 시각(updated_at vs google_synced_at) 비교로 판정하는 방법도 있지만, Postgres 시계와
-- Google 시계를 넘나드는 비교라 여유값(grace)에 기대야 하고 오탐이 생긴다.
-- 대신 "이번에 보낼 페이로드"를 그대로 해싱해 마지막으로 보낸 것과 대조한다.
-- 시계에 의존하지 않고, 바뀐 게 없으면 확실히 없다고 말할 수 있다.
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS google_content_hash text;
