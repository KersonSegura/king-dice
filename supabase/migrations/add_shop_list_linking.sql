-- Add shopListMasterGameId column to games table for linking shop lists
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS "shopListMasterGameId" INT REFERENCES public.games(id) ON DELETE SET NULL;

-- Create index for better performance when querying linked games
CREATE INDEX IF NOT EXISTS idx_games_shop_list_master ON public.games("shopListMasterGameId");

-- Add comment explaining the column
COMMENT ON COLUMN public.games."shopListMasterGameId" IS 'If set, this game uses the shop items from the referenced game. If null, this game has its own shop items.';

