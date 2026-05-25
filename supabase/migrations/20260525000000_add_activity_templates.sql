-- 1. Create activity_templates table
CREATE TABLE public.activity_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  duration_minutes integer default 60 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add template_id to activities table
ALTER TABLE public.activities 
ADD COLUMN template_id uuid references public.activity_templates(id) on delete set null;

-- 3. Trigger for updated_at
CREATE TRIGGER on_activity_templates_updated
  BEFORE UPDATE ON public.activity_templates
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 4. RLS for activity_templates
ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity templates." 
ON public.activity_templates FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity templates." 
ON public.activity_templates FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity templates." 
ON public.activity_templates FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity templates." 
ON public.activity_templates FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Create RPC function to get activity insights safely and efficiently
CREATE OR REPLACE FUNCTION public.get_activity_insights(
  p_user_id uuid,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS TABLE (
  template_id uuid,
  category_id uuid,
  total_minutes integer,
  activity_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.template_id,
    COALESCE(at.category_id, am.category_id) as category_id,
    CAST(SUM(EXTRACT(EPOCH FROM (a.end_time - a.start_time))/60) AS integer) as total_minutes,
    CAST(COUNT(a.id) AS integer) as activity_count
  FROM public.activities a
  LEFT JOIN public.activity_templates at ON a.template_id = at.id
  -- We also want to include legacy activities that have a category map but no template
  LEFT JOIN public.activity_category_map am ON a.id = am.activity_id
  WHERE a.user_id = p_user_id
    AND a.start_time >= p_start_date
    AND a.start_time <= p_end_date
    AND a.deleted_at IS NULL
  GROUP BY a.template_id, COALESCE(at.category_id, am.category_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
