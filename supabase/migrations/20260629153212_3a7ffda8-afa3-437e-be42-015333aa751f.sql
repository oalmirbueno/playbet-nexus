ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS slug text;
UPDATE public.platforms SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS platforms_slug_unique ON public.platforms (slug) WHERE slug IS NOT NULL;