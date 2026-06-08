-- 기존 RPC 반환 타입이 변경되므로 먼저 삭제
DROP FUNCTION IF EXISTS public.get_my_sessions();

-- 세션별 실제 클라이언트 정보를 저장하는 테이블
CREATE TABLE public.session_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_ip TEXT,
  client_user_agent TEXT,
  logged_in_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id)
);

ALTER TABLE public.session_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own session metadata"
  ON public.session_metadata FOR ALL USING (auth.uid() = user_id);

-- RPC 재작성: session_metadata와 LEFT JOIN하여 실제 IP/UA 우선 반환
CREATE OR REPLACE FUNCTION public.get_my_sessions()
RETURNS TABLE (
  session_id uuid,
  user_agent text,
  ip text,
  created_at timestamptz,
  updated_at timestamptz,
  refreshed_at timestamp
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    COALESCE(m.client_user_agent, s.user_agent) AS user_agent,
    COALESCE(m.client_ip, s.ip::text) AS ip,
    s.created_at,
    s.updated_at,
    s.refreshed_at
  FROM auth.sessions s
  LEFT JOIN public.session_metadata m ON m.session_id = s.id
  WHERE s.user_id = auth.uid()
    AND (s.not_after IS NULL OR s.not_after > now())
  ORDER BY s.updated_at DESC;
END;
$$;
