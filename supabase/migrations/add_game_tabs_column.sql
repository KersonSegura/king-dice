-- Add game_tabs column to support multiple game tabs (like Excel sheets)
ALTER TABLE public.game_night_trackers 
ADD COLUMN IF NOT EXISTS game_tabs JSONB;

-- game_tabs structure:
-- [
--   {
--     "id": "tab-1",
--     "name": "All Games",
--     "players": [...]
--   },
--   {
--     "id": "tab-2",
--     "name": "Catan",
--     "players": [...]
--   }
-- ]
