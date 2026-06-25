-- 웹훅/cron 동시 pull 동기화의 google_sync_token 경쟁을 막기 위한 coalescing lock 컬럼.
-- sync_lock_at: 잠금 획득 시각(2분 초과 시 스스로 만료되어 교착 방지)
-- sync_rerun_requested: 잠금 보유 중 들어온 동기화 요청을 후행 1회로 합치기 위한 플래그
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS sync_lock_at timestamptz,
ADD COLUMN IF NOT EXISTS sync_rerun_requested boolean DEFAULT false;
