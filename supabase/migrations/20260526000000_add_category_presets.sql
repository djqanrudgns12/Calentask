CREATE TABLE category_presets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 활성화
ALTER TABLE category_presets ENABLE ROW LEVEL SECURITY;

-- 정책 생성
CREATE POLICY "Users can view their own category presets" ON category_presets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category presets" ON category_presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category presets" ON category_presets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category presets" ON category_presets
  FOR DELETE USING (auth.uid() = user_id);

-- 성능 향상을 위한 인덱스 생성
CREATE INDEX idx_category_presets_user_id ON category_presets(user_id);
