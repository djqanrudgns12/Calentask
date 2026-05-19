-- Create users table (public profile)
CREATE TABLE public.users (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  username text,
  recovery_email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create user_settings table
CREATE TABLE public.user_settings (
  user_id uuid references public.users(id) on delete cascade not null primary key,
  show_korean_holidays boolean default true,
  theme text default 'system',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create categories table
CREATE TABLE public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  hex_color text not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create activities table
CREATE TYPE activity_type AS ENUM ('EVENT', 'TASK');

CREATE TABLE public.activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  is_all_day boolean default false,
  memo text,
  type activity_type default 'EVENT',
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create activity_category_map table
CREATE TABLE public.activity_category_map (
  activity_id uuid references public.activities(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  primary key (activity_id, category_id)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER on_user_settings_updated
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_activities_updated
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- RLS (Row Level Security) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_category_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile." ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own settings." ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings." ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories." ON public.categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own activities." ON public.activities FOR ALL USING (auth.uid() = user_id);

-- Activity Category Map Policy
CREATE POLICY "Users can manage own activity tags." ON public.activity_category_map FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.activities a 
    WHERE a.id = activity_id AND a.user_id = auth.uid()
  )
);

-- Trigger for new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Insert into public.users
  INSERT INTO public.users (id, full_name, username, recovery_email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'recovery_email'
  );

  -- 2. Insert into user_settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  -- 3. Insert default categories (Work, Personal)
  INSERT INTO public.categories (user_id, name, hex_color, is_default)
  VALUES 
    (NEW.id, '업무', '#3b82f6', true), -- blue-500
    (NEW.id, '개인', '#22c55e', true); -- green-500

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
