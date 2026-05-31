-- Create user_security_pin table
CREATE TABLE public.user_security_pin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hashed_pin TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id)
);

-- Create archive_tabs table
CREATE TABLE public.archive_tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    board_type TEXT NOT NULL, -- 'list', 'canvas', 'masonry', 'table', 'gallery', 'kanban', 'journal'
    is_secure BOOLEAN DEFAULT false,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create notes table
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tab_id UUID NOT NULL REFERENCES public.archive_tabs(id) ON DELETE CASCADE,
    content_data JSONB DEFAULT '{}'::jsonb, -- Flexible structure for different board types
    tags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create agenda_tasks table
CREATE TABLE public.agenda_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'inbox', -- 'inbox', 'today', 'done', 'backlog'
    priority TEXT DEFAULT 'none', -- 'low', 'medium', 'high', 'none'
    expected_duration_minutes INTEGER,
    linked_event_id UUID,
    source_note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.user_security_pin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own security pin" ON public.user_security_pin FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own archive tabs" ON public.archive_tabs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own agenda tasks" ON public.agenda_tasks FOR ALL USING (auth.uid() = user_id);
