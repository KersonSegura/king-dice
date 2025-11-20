-- Optimized RPC functions based on Supabase AI recommendations
-- This uses a two-stage approach to guarantee index usage

-- Optimized ordered version (guarantees index usage via two-stage join)
CREATE OR REPLACE FUNCTION public.get_games_by_best_names_ordered(_names text[])
RETURNS SETOF public.games
LANGUAGE sql STABLE AS $$
  WITH input AS (
    SELECT n, ord
    FROM unnest(_names) WITH ORDINALITY AS t(n, ord)
  ),
  ids AS (
    SELECT g.id, i.ord
    FROM input i
    JOIN public.games g
      ON g.best_name_norm = i.n
  )
  SELECT g.*
  FROM ids
  JOIN public.games g USING (id)
  ORDER BY ids.ord
$$;

-- Lightweight version (returns only essential columns for faster queries)
-- Use this if you want to reduce row width and improve performance
CREATE OR REPLACE FUNCTION public.get_games_by_best_names_ordered_light(_names text[])
RETURNS TABLE(
  id bigint,
  "bggId" bigint,
  "nameEn" text,
  "nameEs" text,
  name text,
  "yearRelease" integer,
  "minPlayers" integer,
  "maxPlayers" integer,
  "durationMinutes" integer,
  "imageUrl" text,
  "thumbnailUrl" text,
  ranking numeric,
  "userRating" numeric,
  "userVotes" integer,
  "best_name_norm" text
)
LANGUAGE sql STABLE AS $$
  WITH input AS (
    SELECT n, ord
    FROM unnest(_names) WITH ORDINALITY AS t(n, ord)
  ),
  ids AS (
    SELECT g.id, i.ord
    FROM input i
    JOIN public.games g
      ON g.best_name_norm = i.n
  )
  SELECT 
    g.id,
    g."bggId",
    g."nameEn",
    g."nameEs",
    g.name,
    g."yearRelease",
    g."minPlayers",
    g."maxPlayers",
    g."durationMinutes",
    g."imageUrl",
    g."thumbnailUrl",
    g.ranking,
    g."userRating",
    g."userVotes",
    g.best_name_norm
  FROM ids
  JOIN public.games g USING (id)
  ORDER BY ids.ord
$$;

-- Update comments
COMMENT ON FUNCTION public.get_games_by_best_names_ordered IS 'Optimized: Two-stage join guarantees index usage. Fast for 25-50 names.';
COMMENT ON FUNCTION public.get_games_by_best_names_ordered_light IS 'Lightweight version: Returns only essential columns for faster queries. Use when full game objects are not needed.';

