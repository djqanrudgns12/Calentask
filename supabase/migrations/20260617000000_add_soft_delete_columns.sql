-- 통합 휴지통을 위한 소프트 삭제 컬럼 추가
-- archive_tabs, notes, anniversaries 테이블에 deleted_at 컬럼을 추가합니다.

-- 1. archive_tabs
ALTER TABLE archive_tabs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. anniversaries
ALTER TABLE anniversaries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 4. agenda_tasks (이미 코드에서 사용 중이지만 스키마에 공식 추가)
ALTER TABLE agenda_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
