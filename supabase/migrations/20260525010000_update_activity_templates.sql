-- Add memo and hex_color to activity_templates
ALTER TABLE public.activity_templates
ADD COLUMN memo text,
ADD COLUMN hex_color text;
