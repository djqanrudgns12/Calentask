-- Phase 2: upload_history 기능 확장을 위한 스키마 변경
-- 목적: 
--   1) activities에 upload_history_id를 추가하여 어떤 업로드로 생성된 일정인지 추적 (삭제 시 사용)
--   2) upload_history에 added_items JSONB를 추가하여 미리보기 데이터 저장

-- 1. activities 테이블에 upload_history_id FK 추가
-- 기존 행은 NULL로 유지 (이전에 수동 생성된 일정은 업로드와 무관)
-- ON DELETE SET NULL: upload_history가 삭제되어도 activity는 보존 (이력만 삭제 시)
ALTER TABLE public.activities 
  ADD COLUMN upload_history_id UUID REFERENCES public.upload_history(id) ON DELETE SET NULL;

-- 2. upload_history 테이블에 added_items JSONB 추가
-- 형식: [{"title":"출장명","start_time":"...","end_time":"..."}, ...]
-- 기존 행은 빈 배열로 기본값 설정되어 역호환 보장
ALTER TABLE public.upload_history 
  ADD COLUMN added_items JSONB DEFAULT '[]'::jsonb;

-- 3. 인덱스: upload_history_id로 일정을 빠르게 조회하기 위함 (삭제 시 성능)
-- NULL이 아닌 경우만 인덱싱하여 공간 절약
CREATE INDEX idx_activities_upload_history_id 
  ON public.activities(upload_history_id) 
  WHERE upload_history_id IS NOT NULL;
