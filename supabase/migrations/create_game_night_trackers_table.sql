-- Create game_night_trackers table for storing game night statistics
CREATE TABLE IF NOT EXISTS public.game_night_trackers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  tracker_name TEXT NOT NULL DEFAULT 'My Game Night Tracker',
  share_id TEXT UNIQUE, -- For shareable URLs
  game_filter TEXT, -- NULL = all games, or specific game name (legacy)
  players JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of player objects (legacy)
  game_tabs JSONB, -- Array of game tabs with players (new structure)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each player object structure:
  -- {
  --   "name": "Player Name",
  --   "victories": 0,
  --   "gameNights": 0,
  --   "gamesPlayed": 0,
  --   "winRate": 0.0,
  --   "winRatePercentage": 0.0
  -- }
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_game_night_trackers_user_id ON public.game_night_trackers(user_id);
CREATE INDEX IF NOT EXISTS idx_game_night_trackers_share_id ON public.game_night_trackers(share_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.game_night_trackers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own trackers
CREATE POLICY "Users can view their own trackers"
  ON public.game_night_trackers
  FOR SELECT
  USING ((select auth.uid())::text = user_id);

-- Policy: Users can insert their own trackers
CREATE POLICY "Users can insert their own trackers"
  ON public.game_night_trackers
  FOR INSERT
  WITH CHECK ((select auth.uid())::text = user_id);

-- Policy: Users can update their own trackers
CREATE POLICY "Users can update their own trackers"
  ON public.game_night_trackers
  FOR UPDATE
  USING ((select auth.uid())::text = user_id)
  WITH CHECK ((select auth.uid())::text = user_id);

-- Policy: Users can delete their own trackers
CREATE POLICY "Users can delete their own trackers"
  ON public.game_night_trackers
  FOR DELETE
  USING ((select auth.uid())::text = user_id);

-- Policy: Anyone can view shared trackers (by share_id)
CREATE POLICY "Anyone can view shared trackers"
  ON public.game_night_trackers
  FOR SELECT
  USING (share_id IS NOT NULL);
