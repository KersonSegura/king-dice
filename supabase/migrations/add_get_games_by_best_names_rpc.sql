-- RPC function to get games by normalized names (recommended by Supabase AI)
-- This is more efficient than large .in() queries for 25-50 games

-- Basic version (fast, index-friendly)
CREATE OR REPLACE FUNCTION public.get_games_by_best_names(_names text[])
RETURNS SETOF public.games
LANGUAGE sql STABLE AS $$
  SELECT g.*
  FROM public.games g
  WHERE g.best_name_norm = ANY(_names)
$$;

-- Ordered version (preserves input order)
CREATE OR REPLACE FUNCTION public.get_games_by_best_names_ordered(_names text[])
RETURNS SETOF public.games
LANGUAGE sql STABLE AS $$
  WITH input AS (
    SELECT n, ord
    FROM unnest(_names) WITH ORDINALITY AS t(n, ord)
  )
  SELECT g.*
  FROM input i
  JOIN public.games g
    ON g.best_name_norm = i.n
  ORDER BY i.ord
$$;

-- Add comments
COMMENT ON FUNCTION public.get_games_by_best_names IS 'Get games by normalized names using efficient = ANY() pattern. Fast for 25-50 names.';
COMMENT ON FUNCTION public.get_games_by_best_names_ordered IS 'Get games by normalized names preserving input order. Fast for 25-50 names.';

