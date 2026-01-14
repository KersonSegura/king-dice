-- Enable Row Level Security (RLS) on all public tables
-- This addresses the security warnings from Supabase Advisors
-- Based on: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public

-- Note: Since you're using service_role key on server-side (which bypasses RLS),
-- these policies mainly affect client-side access using the anon key.

-- Enable RLS on all tables
ALTER TABLE public.game_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catan_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catan_nomination_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boardle_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixel_canvas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixel_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixel_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_game_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.most_played_game_list ENABLE ROW LEVEL SECURITY;

-- Create basic policies for read access (public data)
-- These allow anyone to read public data, but only authenticated users can modify

-- Games and related data (public read, authenticated write)
CREATE POLICY "Games are viewable by everyone" ON public.games FOR SELECT USING (true);
CREATE POLICY "Game descriptions are viewable by everyone" ON public.game_descriptions FOR SELECT USING (true);
CREATE POLICY "Game rules are viewable by everyone" ON public.game_rules FOR SELECT USING (true);
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Mechanics are viewable by everyone" ON public.mechanics FOR SELECT USING (true);
CREATE POLICY "Game categories are viewable by everyone" ON public.game_categories FOR SELECT USING (true);
CREATE POLICY "Game mechanics are viewable by everyone" ON public.game_mechanics FOR SELECT USING (true);
CREATE POLICY "Expansions are viewable by everyone" ON public.expansions FOR SELECT USING (true);

-- User votes (public read, authenticated write)
CREATE POLICY "User votes are viewable by everyone" ON public.user_votes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own votes" ON public.user_votes FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update their own votes" ON public.user_votes FOR UPDATE USING (auth.uid()::text = "userId");

-- Posts (public read, authenticated write)
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.uid()::text = "authorId" OR auth.uid()::text = "author_id");

-- Post votes (public read, authenticated write)
CREATE POLICY "Post votes are viewable by everyone" ON public.post_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own post votes" ON public.post_votes FOR ALL USING (auth.uid()::text = user_id);

-- Gallery (public read, authenticated write)
CREATE POLICY "Gallery images are viewable by everyone" ON public.gallery_images FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create gallery images" ON public.gallery_images FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own gallery images" ON public.gallery_images FOR UPDATE USING (auth.uid()::text = "authorId" OR auth.uid()::text = "author_id" OR auth.uid()::text = "userId" OR auth.uid()::text = "user_id");

-- Gallery votes (public read, authenticated write)
CREATE POLICY "Gallery votes are viewable by everyone" ON public.gallery_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own gallery votes" ON public.gallery_votes FOR ALL USING (auth.uid()::text = user_id);

-- Comments (public read, authenticated write)
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING (auth.uid()::text = "authorId" OR auth.uid()::text = "author_id" OR auth.uid()::text = "userId" OR auth.uid()::text = "user_id");

-- Comment likes (public read, authenticated write)
CREATE POLICY "Comment likes are viewable by everyone" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own comment likes" ON public.comment_likes FOR ALL USING (auth.uid()::text = user_id);

-- Users (limited read, users can update their own)
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid()::text = id::text);

-- User games (users can manage their own)
CREATE POLICY "User games are viewable by everyone" ON public.user_games FOR SELECT USING (true);
CREATE POLICY "Users can manage their own games" ON public.user_games FOR ALL USING (auth.uid()::text = "userId" OR auth.uid()::text = "user_id");

-- Friendships (users can see their own)
CREATE POLICY "Users can view their own friendships" ON public.friendships FOR SELECT USING (auth.uid()::text = "userId" OR auth.uid()::text = "user_id" OR auth.uid()::text = "friendId" OR auth.uid()::text = "friend_id");
CREATE POLICY "Users can manage their own friendships" ON public.friendships FOR ALL USING (auth.uid()::text = "userId" OR auth.uid()::text = "user_id");

-- Follows (public read, authenticated write)
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON public.follows FOR ALL USING (auth.uid()::text = "followerId" OR auth.uid()::text = "follower_id");

-- Follow requests (users can see their own)
CREATE POLICY "Users can view their own follow requests" ON public.follow_requests FOR SELECT USING (auth.uid()::text = "requesterId" OR auth.uid()::text = "requester_id" OR auth.uid()::text = "targetId" OR auth.uid()::text = "target_id");
CREATE POLICY "Users can manage their own follow requests" ON public.follow_requests FOR ALL USING (auth.uid()::text = "requesterId" OR auth.uid()::text = "requester_id");

-- Chats (users can see their own)
CREATE POLICY "Users can view their own chats" ON public.chats FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = chats.id 
    AND (user_id = auth.uid()::text OR "userId" = auth.uid()::text)
  )
);
CREATE POLICY "Authenticated users can create chats" ON public.chats FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Chat participants (users can see their own)
CREATE POLICY "Users can view their own chat participants" ON public.chat_participants FOR SELECT USING (user_id = auth.uid()::text OR "userId" = auth.uid()::text);
CREATE POLICY "Users can manage their own chat participation" ON public.chat_participants FOR ALL USING (user_id = auth.uid()::text OR "userId" = auth.uid()::text);

-- Messages (users can see messages in their chats)
CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = messages.chat_id 
    AND (user_id = auth.uid()::text OR "userId" = auth.uid()::text)
  )
);
CREATE POLICY "Authenticated users can create messages" ON public.messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Catan nominations (public read, authenticated write)
CREATE POLICY "Catan nominations are viewable by everyone" ON public.catan_nominations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create nominations" ON public.catan_nominations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Catan nomination votes (public read, authenticated write)
CREATE POLICY "Catan votes are viewable by everyone" ON public.catan_nomination_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own votes" ON public.catan_nomination_votes FOR ALL USING (auth.uid()::text = user_id);

-- Boardle hints (public read, admin write)
CREATE POLICY "Boardle hints are viewable by everyone" ON public.boardle_hints FOR SELECT USING (true);

-- Pixel canvas (public read, authenticated write)
CREATE POLICY "Pixel canvas is viewable by everyone" ON public.pixel_canvas FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update pixels" ON public.pixel_canvas FOR UPDATE WITH CHECK (auth.role() = 'authenticated');

-- Pixel placements (public read, authenticated write)
CREATE POLICY "Pixel placements are viewable by everyone" ON public.pixel_placements FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create placements" ON public.pixel_placements FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Pixel cooldowns (users can see their own)
CREATE POLICY "Users can view their own cooldowns" ON public.pixel_cooldowns FOR SELECT USING (user_id = auth.uid()::text OR "userId" = auth.uid()::text);

-- Canvas snapshots (public read, authenticated write)
CREATE POLICY "Canvas snapshots are viewable by everyone" ON public.canvas_snapshots FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create snapshots" ON public.canvas_snapshots FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- User XP (public read, system write)
CREATE POLICY "User XP is viewable by everyone" ON public.user_xp FOR SELECT USING (true);

-- XP history (users can see their own)
CREATE POLICY "Users can view their own XP history" ON public.xp_history FOR SELECT USING (user_id = auth.uid()::text OR "userId" = auth.uid()::text);

-- Two factor codes (users can see their own)
CREATE POLICY "Users can view their own 2FA codes" ON public.two_factor_codes FOR SELECT USING (user_id = auth.uid()::text OR "userId" = auth.uid()::text);
CREATE POLICY "Users can manage their own 2FA codes" ON public.two_factor_codes FOR ALL USING (user_id = auth.uid()::text OR "userId" = auth.uid()::text);

-- Reports (authenticated users can create, admins can view)
CREATE POLICY "Authenticated users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Note: Reports viewing should be restricted to admins only - you may want to add admin check

-- Game shop items (public read, authenticated write)
CREATE POLICY "Game shop items are viewable by everyone" ON public.game_shop_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create shop items" ON public.game_shop_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update shop items" ON public.game_shop_items FOR UPDATE WITH CHECK (auth.role() = 'authenticated');

-- Post poll votes (public read, authenticated write)
CREATE POLICY "Post poll votes are viewable by everyone" ON public.post_poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own poll votes" ON public.post_poll_votes FOR ALL USING (auth.uid()::text = user_id);

-- Hot game list (public read, system write)
CREATE POLICY "Hot game list is viewable by everyone" ON public.hot_game_list FOR SELECT USING (true);

-- Most played game list (public read, system write)
CREATE POLICY "Most played game list is viewable by everyone" ON public.most_played_game_list FOR SELECT USING (true);

-- Verify RLS is enabled
DO $$
DECLARE
  rls_disabled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_disabled_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT IN ('_prisma_migrations', 'schema_migrations')
    AND rowsecurity = false;
  
  IF rls_disabled_count > 0 THEN
    RAISE NOTICE 'Warning: % tables still have RLS disabled', rls_disabled_count;
  ELSE
    RAISE NOTICE 'Success: All public tables have RLS enabled';
  END IF;
END $$;

