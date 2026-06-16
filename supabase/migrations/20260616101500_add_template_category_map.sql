-- Migration: Add template_category_map for multiple categories support
-- Description: 템플릿의 다중 카테고리를 지원하기 위한 연결 테이블 신설 및 기존 데이터 마이그레이션

CREATE TABLE IF NOT EXISTS public.template_category_map (
    template_id uuid NOT NULL REFERENCES public.activity_templates(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (template_id, category_id)
);

-- Enable RLS
ALTER TABLE public.template_category_map ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Users can manage their own template category maps"
ON public.template_category_map
FOR ALL
USING (
  template_id IN (
    SELECT id FROM public.activity_templates WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  template_id IN (
    SELECT id FROM public.activity_templates WHERE user_id = auth.uid()
  )
);

-- 데이터 마이그레이션: 기존 단일 category_id를 맵핑 테이블로 복사 (NULL인 경우 제외)
INSERT INTO public.template_category_map (template_id, category_id)
SELECT id, category_id
FROM public.activity_templates
WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;
