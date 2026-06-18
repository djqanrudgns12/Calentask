CREATE TABLE IF NOT EXISTS public.link_lounge_bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text NOT NULL,
  description text,
  image text,
  category text NOT NULL DEFAULT '기타',
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT link_lounge_bookmarks_pkey PRIMARY KEY (id)
);

ALTER TABLE public.link_lounge_bookmarks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'link_lounge_bookmarks'
        AND policyname = 'Users can manage their own link_lounge_bookmarks'
    ) THEN
        CREATE POLICY "Users can manage their own link_lounge_bookmarks"
          ON public.link_lounge_bookmarks
          FOR ALL
          USING (auth.uid() = user_id);
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.link_lounge_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  CONSTRAINT link_lounge_categories_pkey PRIMARY KEY (id)
);

ALTER TABLE public.link_lounge_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'link_lounge_categories'
        AND policyname = 'Users can manage their own link_lounge_categories'
    ) THEN
        CREATE POLICY "Users can manage their own link_lounge_categories"
          ON public.link_lounge_categories
          FOR ALL
          USING (auth.uid() = user_id);
    END IF;
END
$$;
