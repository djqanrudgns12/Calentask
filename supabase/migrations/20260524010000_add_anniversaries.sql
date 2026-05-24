-- Create Enum for preset types
CREATE TYPE anniversary_preset_type AS ENUM (
    'COUPLE', 'BIRTHDAY', 'LUNAR_BIRTHDAY', 'EXAM', 'PAYDAY', 'CUSTOM'
);

-- Create anniversaries table
CREATE TABLE anniversaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preset_type anniversary_preset_type NOT NULL,
    title TEXT NOT NULL,
    base_date DATE NOT NULL,
    is_lunar BOOLEAN NOT NULL DEFAULT FALSE,
    calculation_rule JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Set up RLS
ALTER TABLE anniversaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own anniversaries"
    ON anniversaries
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_anniversaries_user_id ON anniversaries(user_id);
