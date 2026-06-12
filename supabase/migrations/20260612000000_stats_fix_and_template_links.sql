-- BUG-08: default_start_time 컬럼 추가 (코드에서 이미 참조하지만 DB에 없음)
ALTER TABLE public.activity_templates
ADD COLUMN IF NOT EXISTS default_start_time time;

-- Phase 2-FEAT01: 템플릿-일정 통계 전용 연결 테이블
CREATE TABLE IF NOT EXISTS public.template_activity_links (
  id uuid default gen_random_uuid() primary key,
  template_id uuid references public.activity_templates(id) on delete cascade not null,
  activity_id uuid references public.activities(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(template_id, activity_id)
);

ALTER TABLE public.template_activity_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own template links"
ON public.template_activity_links FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.activity_templates
    WHERE id = template_activity_links.template_id
    AND user_id = auth.uid()
  )
);

-- Phase 2-FEAT02: 커스텀 시간 단위
ALTER TABLE public.activity_templates
ADD COLUMN IF NOT EXISTS custom_unit_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_unit_minutes integer DEFAULT 60;
