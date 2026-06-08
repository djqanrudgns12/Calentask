-- Function to get the user's active sessions
CREATE OR REPLACE FUNCTION public.get_my_sessions()
RETURNS TABLE (
  session_id uuid,
  user_agent text,
  ip inet,
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
    s.user_agent,
    s.ip,
    s.created_at,
    s.updated_at,
    s.refreshed_at
  FROM auth.sessions s
  WHERE s.user_id = auth.uid()
    AND (s.not_after IS NULL OR s.not_after > now())
  ORDER BY s.updated_at DESC;
END;
$$;

-- Function to delete a specific session belonging to the current user
CREATE OR REPLACE FUNCTION public.delete_my_session(target_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rows_deleted int;
BEGIN
  DELETE FROM auth.sessions
  WHERE id = target_session_id
    AND user_id = auth.uid();
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  RETURN rows_deleted > 0;
END;
$$;
