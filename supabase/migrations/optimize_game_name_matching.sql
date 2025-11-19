-- Create indexes for case-insensitive name matching (using lower() expression indexes)
-- These indexes make lower(column) = value checks fast and indexable

CREATE INDEX IF NOT EXISTS idx_games_lower_name_en ON public.games (lower("nameEn"));
CREATE INDEX IF NOT EXISTS idx_games_lower_name_es ON public.games (lower("nameEs"));
CREATE INDEX IF NOT EXISTS idx_games_lower_name ON public.games (lower("name"));

-- Create a function to efficiently match games by names using VALUES CTE
-- This avoids long OR clauses and uses set-based joins for better performance
-- Returns games in the order they appear in the input array

CREATE OR REPLACE FUNCTION match_games_by_names(game_names text[])
RETURNS TABLE (
  id bigint,
  "nameEn" text,
  "nameEs" text,
  name text,
  "yearRelease" integer,
  image text,
  "bggRating" numeric,
  "bggRanking" integer,
  "bggVotes" integer,
  match_order integer
) AS $$
BEGIN
  RETURN QUERY
  WITH names(name, name_no_apostrophe, idx) AS (
    SELECT 
      lower(name),
      lower(replace(name, '''', '')),
      row_number() OVER () - 1
    FROM unnest(game_names) AS name
  )
  SELECT DISTINCT ON (g.id)
    g.id,
    g."nameEn",
    g."nameEs",
    g.name,
    g."yearRelease",
    g.image,
    g."bggRating",
    g."bggRanking",
    g."bggVotes",
    MIN(n.idx) AS match_order
  FROM public.games g
  JOIN names n
    ON lower(g."nameEn") = n.name
    OR lower(g."nameEs") = n.name
    OR lower(g."name") = n.name
    OR lower(g."nameEn") = n.name_no_apostrophe
    OR lower(g."nameEs") = n.name_no_apostrophe
    OR lower(g."name") = n.name_no_apostrophe
  GROUP BY g.id, g."nameEn", g."nameEs", g.name, g."yearRelease", g.image, g."bggRating", g."bggRanking", g."bggVotes"
  ORDER BY match_order, g.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users (or service role)
GRANT EXECUTE ON FUNCTION match_games_by_names(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION match_games_by_names(text[]) TO service_role;

