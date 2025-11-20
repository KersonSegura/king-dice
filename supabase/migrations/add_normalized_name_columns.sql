-- Add normalized name columns for fast, reliable game lookups
-- These are generated columns that automatically normalize names

-- Best name (uses nameEn, falls back to nameEs, then name)
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS best_name_norm text GENERATED ALWAYS AS (
    lower(regexp_replace(coalesce("nameEn", "nameEs", "name"), '\s+', ' ', 'g'))
  ) STORED;

-- Individual normalized columns for each language
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS name_en_norm text GENERATED ALWAYS AS (
    lower(regexp_replace(coalesce("nameEn", ''), '\s+', ' ', 'g'))
  ) STORED,
  ADD COLUMN IF NOT EXISTS name_es_norm text GENERATED ALWAYS AS (
    lower(regexp_replace(coalesce("nameEs", ''), '\s+', ' ', 'g'))
  ) STORED,
  ADD COLUMN IF NOT EXISTS name_norm text GENERATED ALWAYS AS (
    lower(regexp_replace(coalesce("name", ''), '\s+', ' ', 'g'))
  ) STORED;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_games_best_name_norm ON public.games(best_name_norm);
CREATE INDEX IF NOT EXISTS idx_games_name_en_norm ON public.games(name_en_norm);
CREATE INDEX IF NOT EXISTS idx_games_name_es_norm ON public.games(name_es_norm);
CREATE INDEX IF NOT EXISTS idx_games_name_norm ON public.games(name_norm);

-- Add comment explaining the columns
COMMENT ON COLUMN public.games.best_name_norm IS 'Normalized name for fast lookups. Uses nameEn, falls back to nameEs, then name. Lowercased and whitespace normalized.';
COMMENT ON COLUMN public.games.name_en_norm IS 'Normalized English name (lowercased, whitespace normalized)';
COMMENT ON COLUMN public.games.name_es_norm IS 'Normalized Spanish name (lowercased, whitespace normalized)';
COMMENT ON COLUMN public.games.name_norm IS 'Normalized name field (lowercased, whitespace normalized)';

