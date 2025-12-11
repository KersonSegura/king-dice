-- Add amazonUrl column to games table
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS "amazonUrl" TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.games."amazonUrl" IS 'Amazon Associates link for purchasing the game';

