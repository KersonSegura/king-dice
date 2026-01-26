-- Add policy to allow public viewing of game night trackers
-- This allows anyone to view trackers by username (similar to how user profiles are public)
CREATE POLICY "Game night trackers are viewable by everyone"
  ON public.game_night_trackers
  FOR SELECT
  USING (true);
