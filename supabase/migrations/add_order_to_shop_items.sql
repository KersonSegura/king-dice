-- Add order column to game_shop_items table for custom ordering
ALTER TABLE public.game_shop_items
  ADD COLUMN IF NOT EXISTS "order" INT DEFAULT 999;

-- Update existing rows to have order based on their creation time
UPDATE public.game_shop_items
SET "order" = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "gameId" ORDER BY created_at) as row_num
  FROM public.game_shop_items
) AS subquery
WHERE public.game_shop_items.id = subquery.id;

-- Create index for better performance when sorting
CREATE INDEX IF NOT EXISTS idx_game_shop_items_order ON public.game_shop_items("gameId", "order");

