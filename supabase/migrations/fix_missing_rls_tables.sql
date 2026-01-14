-- Fix missing RLS on tables reported by Supabase linter
-- Run this migration in Supabase SQL Editor to enable RLS on the missing tables

-- Enable RLS on missing tables
ALTER TABLE public.game_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_game_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.most_played_game_list ENABLE ROW LEVEL SECURITY;

-- Create policies for game_shop_items (public read, authenticated write)
DROP POLICY IF EXISTS "Game shop items are viewable by everyone" ON public.game_shop_items;
CREATE POLICY "Game shop items are viewable by everyone" 
  ON public.game_shop_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create shop items" ON public.game_shop_items;
CREATE POLICY "Authenticated users can create shop items" 
  ON public.game_shop_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update shop items" ON public.game_shop_items;
CREATE POLICY "Authenticated users can update shop items" 
  ON public.game_shop_items FOR UPDATE WITH CHECK (auth.role() = 'authenticated');

-- Create policies for post_poll_votes (public read, authenticated write)
DROP POLICY IF EXISTS "Post poll votes are viewable by everyone" ON public.post_poll_votes;
CREATE POLICY "Post poll votes are viewable by everyone" 
  ON public.post_poll_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own poll votes" ON public.post_poll_votes;
CREATE POLICY "Users can manage their own poll votes" 
  ON public.post_poll_votes FOR ALL USING (auth.uid()::text = user_id);

-- Create policies for hot_game_list (public read, system write)
DROP POLICY IF EXISTS "Hot game list is viewable by everyone" ON public.hot_game_list;
CREATE POLICY "Hot game list is viewable by everyone" 
  ON public.hot_game_list FOR SELECT USING (true);

-- Create policies for most_played_game_list (public read, system write)
DROP POLICY IF EXISTS "Most played game list is viewable by everyone" ON public.most_played_game_list;
CREATE POLICY "Most played game list is viewable by everyone" 
  ON public.most_played_game_list FOR SELECT USING (true);
