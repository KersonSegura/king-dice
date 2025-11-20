-- Create curated tables for hot games and most played games
-- These tables store the exact lists we want to display (50 hot, 25 most played)
-- so that API routes can join against them directly without expensive filters.

BEGIN;

-- Hot games curated list
CREATE TABLE IF NOT EXISTS public.hot_game_list (
  best_name_norm text PRIMARY KEY,
  game_id bigint NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  rank integer NOT NULL UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure we can quickly look up by rank and prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS hot_game_list_game_id_idx ON public.hot_game_list(game_id);
CREATE INDEX IF NOT EXISTS hot_game_list_rank_idx ON public.hot_game_list(rank);

-- Most played curated list
CREATE TABLE IF NOT EXISTS public.most_played_game_list (
  best_name_norm text PRIMARY KEY,
  game_id bigint NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  rank integer NOT NULL UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS most_played_game_list_game_id_idx ON public.most_played_game_list(game_id);
CREATE INDEX IF NOT EXISTS most_played_game_list_rank_idx ON public.most_played_game_list(rank);

-- Helper CTE to upsert curated lists
WITH hot_data(best_name_norm, rank) AS (
  VALUES
    ('covenant', 1),
    ('recall', 2),
    ('deckers', 3),
    ('tax the rich', 4),
    ('children of the colossi', 5),
    ('kuldhara', 6),
    ('orloj: the prague astronomical clock', 7),
    ('the hobbit: there and back again', 8),
    ('seti: space agencies', 9),
    ('feya''s swamp', 10),
    ('the lord of the rings: duel for middle-earth – allies', 11),
    ('seti: search for extraterrestrial intelligence', 12),
    ('speakeasy', 13),
    ('the old king''s crown', 14),
    ('the lord of the rings: fate of the fellowship', 15),
    ('sanctuary', 16),
    ('bohemians', 17),
    ('tag team', 18),
    ('vantage', 19),
    ('gelati', 20),
    ('the druids of edora', 21),
    ('take time', 22),
    ('ayar: children of the sun', 23),
    ('ark nova', 24),
    ('galileo''s truth', 25),
    ('the lord of the rings: duel for middle-earth', 26),
    ('1ers contacts', 27),
    ('wispwood', 28),
    ('emberheart', 29),
    ('lost ruins of arnak: twisted paths', 30),
    ('ants', 31),
    ('lost ruins of arnak', 32),
    ('brass: birmingham', 33),
    ('coming of age', 34),
    ('galactic cruise', 35),
    ('forestry', 36),
    ('federation: piracy', 37),
    ('nature', 38),
    ('echoes of time', 39),
    ('arcs', 40),
    ('the elder scrolls: betrayal of the second era', 41),
    ('bomb busters', 42),
    ('terraforming mars', 43),
    ('kingdom crossing', 44),
    ('castle combo', 45),
    ('luthier', 46),
    ('slay the spire: the board game', 47),
    ('origin story', 48),
    ('harmonies', 49),
    ('tainted grail: the fall of avalon', 50)
),
hot_upsert AS (
  INSERT INTO public.hot_game_list (best_name_norm, game_id, rank)
  SELECT hd.best_name_norm, g.id, hd.rank
  FROM hot_data hd
  JOIN public.games g ON g.best_name_norm = hd.best_name_norm
  ON CONFLICT (best_name_norm) DO UPDATE
    SET game_id = EXCLUDED.game_id,
        rank = EXCLUDED.rank,
        updated_at = now()
  RETURNING best_name_norm
)
SELECT count(*) AS hot_games_inserted FROM hot_upsert;

WITH most_data(best_name_norm, rank) AS (
  VALUES
    ('flip 7', 1),
    ('ark nova', 2),
    ('harmonies', 3),
    ('castle combo', 4),
    ('bomb busters', 5),
    ('forest shuffle', 6),
    ('sea salt & paper', 7),
    ('terraforming mars', 8),
    ('azul', 9),
    ('wingspan', 10),
    ('the lord of the rings: fate of the fellowship', 11),
    ('faraway', 12),
    ('sky team', 13),
    ('cascadia', 14),
    ('lost ruins of arnak', 15),
    ('heat: pedal to the metal', 16),
    ('vantage', 17),
    ('seti: search for extraterrestrial intelligence', 18),
    ('the white castle', 19),
    ('scout', 20),
    ('7 wonders duel', 21),
    ('carcassonne', 22),
    ('the gang', 23),
    ('the lord of the rings: the fellowship of the ring – trick-taking game', 24),
    ('splendor', 25)
),
most_upsert AS (
  INSERT INTO public.most_played_game_list (best_name_norm, game_id, rank)
  SELECT md.best_name_norm, g.id, md.rank
  FROM most_data md
  JOIN public.games g ON g.best_name_norm = md.best_name_norm
  ON CONFLICT (best_name_norm) DO UPDATE
    SET game_id = EXCLUDED.game_id,
        rank = EXCLUDED.rank,
        updated_at = now()
  RETURNING best_name_norm
)
SELECT count(*) AS most_games_inserted FROM most_upsert;

COMMIT;

