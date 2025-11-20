-- Complete optimization: Fast, reliable game lookups with minimal payload
-- Based on Supabase AI recommendations for speed and reliability

-- 1. Optimized RPC: Returns only card fields (fast, small payload)
CREATE OR REPLACE FUNCTION public.get_games_card_fields_by_names(_names text[])
RETURNS TABLE(
  id bigint,
  "bggId" bigint,
  best_name_norm text,
  name text,
  "nameEn" text,
  "nameEs" text,
  "yearRelease" integer,
  "minPlayers" integer,
  "maxPlayers" integer,
  "durationMinutes" integer,
  "imageUrl" text,
  "thumbnailUrl" text,
  image text,
  "userRating" numeric,
  "userVotes" integer,
  "isExpansion" boolean,
  ranking numeric,
  "bggRanking" integer,
  "bggRating" numeric,
  "bggVotes" integer
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
    g.best_name_norm,
    g.name,
    g."nameEn",
    g."nameEs",
    g."yearRelease",
    g."minPlayers",
    g."maxPlayers",
    g."durationMinutes",
    g."imageUrl",
    g."thumbnailUrl",
    g.image,
    g."userRating",
    g."userVotes",
    g."isExpansion",
    g.ranking,
    g."bggRanking",
    g."bggRating",
    g."bggVotes"
  FROM ids
  JOIN public.games g USING (id)
  ORDER BY ids.ord
$$;

-- 2. Two-step approach: Get IDs first (ultra-fast, index-only)
CREATE OR REPLACE FUNCTION public.get_game_ids_by_names_ordered(_names text[])
RETURNS TABLE(id bigint, ord int)
LANGUAGE sql STABLE AS $$
  WITH input AS (
    SELECT n, ord
    FROM unnest(_names) WITH ORDINALITY AS t(n, ord)
  )
  SELECT g.id, i.ord
  FROM input i
  JOIN public.games g ON g.best_name_norm = i.n
  ORDER BY i.ord
$$;

-- 3. Precomputed tables for curated lists (most robust approach)
-- These tables store the normalized names and ranks for fast lookups

-- Hot games table
CREATE TABLE IF NOT EXISTS public.hot_game_names (
  best_name_norm text PRIMARY KEY,
  rank integer NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Most played games table
CREATE TABLE IF NOT EXISTS public.most_played_game_names (
  best_name_norm text PRIMARY KEY,
  rank integer NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_hot_game_names_rank ON public.hot_game_names(rank);
CREATE INDEX IF NOT EXISTS idx_most_played_game_names_rank ON public.most_played_game_names(rank);

-- RPC to get hot games using precomputed table (fastest approach)
CREATE OR REPLACE FUNCTION public.get_hot_games_card_fields(limit_count integer DEFAULT 50)
RETURNS TABLE(
  id bigint,
  "bggId" bigint,
  best_name_norm text,
  name text,
  "nameEn" text,
  "nameEs" text,
  "yearRelease" integer,
  "minPlayers" integer,
  "maxPlayers" integer,
  "durationMinutes" integer,
  "imageUrl" text,
  "thumbnailUrl" text,
  image text,
  "userRating" numeric,
  "userVotes" integer,
  "isExpansion" boolean,
  ranking numeric,
  "bggRanking" integer,
  "bggRating" numeric,
  "bggVotes" integer,
  rank integer
)
LANGUAGE sql STABLE AS $$
  SELECT 
    g.id,
    g."bggId",
    g.best_name_norm,
    g.name,
    g."nameEn",
    g."nameEs",
    g."yearRelease",
    g."minPlayers",
    g."maxPlayers",
    g."durationMinutes",
    g."imageUrl",
    g."thumbnailUrl",
    g.image,
    g."userRating",
    g."userVotes",
    g."isExpansion",
    g.ranking,
    g."bggRanking",
    g."bggRating",
    g."bggVotes",
    h.rank
  FROM public.hot_game_names h
  JOIN public.games g ON g.best_name_norm = h.best_name_norm
  ORDER BY h.rank
  LIMIT limit_count
$$;

-- RPC to get most played games using precomputed table
CREATE OR REPLACE FUNCTION public.get_most_played_games_card_fields(limit_count integer DEFAULT 25)
RETURNS TABLE(
  id bigint,
  "bggId" bigint,
  best_name_norm text,
  name text,
  "nameEn" text,
  "nameEs" text,
  "yearRelease" integer,
  "minPlayers" integer,
  "maxPlayers" integer,
  "durationMinutes" integer,
  "imageUrl" text,
  "thumbnailUrl" text,
  image text,
  "userRating" numeric,
  "userVotes" integer,
  "isExpansion" boolean,
  ranking numeric,
  "bggRanking" integer,
  "bggRating" numeric,
  "bggVotes" integer,
  rank integer
)
LANGUAGE sql STABLE AS $$
  SELECT 
    g.id,
    g."bggId",
    g.best_name_norm,
    g.name,
    g."nameEn",
    g."nameEs",
    g."yearRelease",
    g."minPlayers",
    g."maxPlayers",
    g."durationMinutes",
    g."imageUrl",
    g."thumbnailUrl",
    g.image,
    g."userRating",
    g."userVotes",
    g."isExpansion",
    g.ranking,
    g."bggRanking",
    g."bggRating",
    g."bggVotes",
    m.rank
  FROM public.most_played_game_names m
  JOIN public.games g ON g.best_name_norm = m.best_name_norm
  ORDER BY m.rank
  LIMIT limit_count
$$;

-- Comments
COMMENT ON FUNCTION public.get_games_card_fields_by_names IS 'Returns only card fields for fast queries. Two-stage join guarantees index usage.';
COMMENT ON FUNCTION public.get_game_ids_by_names_ordered IS 'Ultra-fast: Returns only IDs. Use for two-step approach when needed.';
COMMENT ON FUNCTION public.get_hot_games_card_fields IS 'Fastest: Uses precomputed hot_game_names table. No array input needed.';
COMMENT ON FUNCTION public.get_most_played_games_card_fields IS 'Fastest: Uses precomputed most_played_game_names table. No array input needed.';
COMMENT ON TABLE public.hot_game_names IS 'Precomputed list of hot games for fast lookups. Refresh via cron or manual process.';
COMMENT ON TABLE public.most_played_game_names IS 'Precomputed list of most played games for fast lookups. Refresh via cron or manual process.';

