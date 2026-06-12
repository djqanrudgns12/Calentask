-- activity_templates 테이블에 커스텀 시간 단위('차시') 관련 컬럼 추가
ALTER TABLE public.activity_templates
ADD COLUMN IF NOT EXISTS custom_unit_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS custom_unit_minutes INTEGER DEFAULT 40;
