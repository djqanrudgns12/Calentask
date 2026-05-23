-- upload_history 테이블 생성
CREATE TABLE upload_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    record_type TEXT NOT NULL,
    added_count INTEGER NOT NULL,
    duplicate_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS 활성화
ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;

-- 정책: 자신의 기록만 접근 가능하도록 설정
CREATE POLICY "Users can view their own upload history"
    ON upload_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upload history"
    ON upload_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upload history"
    ON upload_history FOR DELETE
    USING (auth.uid() = user_id);
