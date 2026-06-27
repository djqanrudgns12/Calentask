-- 학사일정 데이터 관리: 구글 시트 링크 기반 학사일정 등록/관리
-- academic_sources(링크 소스), academic_events(등록 이벤트), academic_exclusion_rules(전역 제외 키워드)

-- ── 소스(링크) 추적 ──
CREATE TABLE public.academic_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  gid text,                                  -- 시트 탭 gid
  sheet_kind text DEFAULT 'auto',            -- 'weekly' | 'monthly' | 'auto'
  label text,                                -- 사용자 지정 별칭 (예: "6월 월중계획")
  year int NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL, -- 메인 캘린더 노출용(옵션, 기본 null)
  last_parser text,                          -- 'rule' | 'llm' (디버그용)
  event_count int DEFAULT 0,
  last_synced_at timestamp with time zone,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- ── 등록된 학사일정 이벤트 ──
CREATE TABLE public.academic_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  source_id uuid REFERENCES public.academic_sources(id) ON DELETE CASCADE NOT NULL,
  event_date date NOT NULL,
  title text NOT NULL,
  norm_title text NOT NULL,                   -- 정규화 제목(중복키)
  dedup_hash text NOT NULL,                   -- sha256(event_date|norm_title) 전역 중복 탐지
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (source_id, event_date, norm_title)
);
CREATE INDEX academic_events_user_date_idx ON public.academic_events (user_id, event_date);
CREATE INDEX academic_events_user_dedup_idx ON public.academic_events (user_id, dedup_hash);

-- ── 전역 제외 키워드 규칙 ──
CREATE TABLE public.academic_exclusion_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  keyword text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, keyword)
);

-- ── RLS ──
ALTER TABLE public.academic_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_exclusion_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own academic sources." ON public.academic_sources FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own academic events." ON public.academic_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own academic exclusion rules." ON public.academic_exclusion_rules FOR ALL USING (auth.uid() = user_id);
