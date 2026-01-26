-- Create game_night_trackers table for storing game night statistics
-- Safe version that handles existing policies
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
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_game_night_trackers_user_id ON public.game_night_trackers(user_id);
CREATE INDEX IF NOT EXISTS idx_game_night_trackers_share_id ON public.game_night_trackers(share_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.game_night_trackers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view their own trackers" ON public.game_night_trackers;
CREATE POLICY "Users can view their own trackers"
  ON public.game_night_trackers
  FOR SELECT
  USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can insert their own trackers" ON public.game_night_trackers;
CREATE POLICY "Users can insert their own trackers"
  ON public.game_night_trackers
  FOR INSERT
  WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can update their own trackers" ON public.game_night_trackers;
CREATE POLICY "Users can update their own trackers"
  ON public.game_night_trackers
  FOR UPDATE
  USING ((select auth.uid())::text = user_id)
  WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can delete their own trackers" ON public.game_night_trackers;
CREATE POLICY "Users can delete their own trackers"
  ON public.game_night_trackers
  FOR DELETE
  USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Anyone can view shared trackers" ON public.game_night_trackers;
CREATE POLICY "Anyone can view shared trackers"
  ON public.game_night_trackers
  FOR SELECT
  USING (share_id IS NOT NULL);
