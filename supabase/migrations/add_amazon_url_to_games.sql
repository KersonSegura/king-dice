-- Add amazonUrl column to games table
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS "amazonUrl" TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.games."amazonUrl" IS 'Amazon Associates link for purchasing the game';

-- Shop items table to allow multiple purchase options per game
CREATE TABLE IF NOT EXISTS public.game_shop_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "gameId" INT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "imageUrl" TEXT,
  link TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_shop_items_game_id ON public.game_shop_items("gameId");
CREATE INDEX IF NOT EXISTS idx_game_shop_items_created_at ON public.game_shop_items(created_at DESC);

