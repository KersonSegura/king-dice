-- Fix all RLS policies, function search_path warnings, and permissive policy warnings
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CREATE ALL MISSING RLS POLICIES
-- ============================================

-- Games and related data (public read, authenticated write)
DROP POLICY IF EXISTS "Games are viewable by everyone" ON public.games;
CREATE POLICY "Games are viewable by everyone" ON public.games FOR SELECT USING (true);

DROP POLICY IF EXISTS "Game descriptions are viewable by everyone" ON public.game_descriptions;
CREATE POLICY "Game descriptions are viewable by everyone" ON public.game_descriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Game rules are viewable by everyone" ON public.game_rules;
CREATE POLICY "Game rules are viewable by everyone" ON public.game_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Mechanics are viewable by everyone" ON public.mechanics;
CREATE POLICY "Mechanics are viewable by everyone" ON public.mechanics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Game categories are viewable by everyone" ON public.game_categories;
CREATE POLICY "Game categories are viewable by everyone" ON public.game_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Game mechanics are viewable by everyone" ON public.game_mechanics;
CREATE POLICY "Game mechanics are viewable by everyone" ON public.game_mechanics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Expansions are viewable by everyone" ON public.expansions;
CREATE POLICY "Expansions are viewable by everyone" ON public.expansions FOR SELECT USING (true);

-- User votes (public read, authenticated write) - uses camelCase: userId, gameId
DROP POLICY IF EXISTS "User votes are viewable by everyone" ON public.user_votes;
CREATE POLICY "User votes are viewable by everyone" ON public.user_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own votes" ON public.user_votes;
CREATE POLICY "Users can insert their own votes" ON public.user_votes FOR INSERT WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update their own votes" ON public.user_votes;
CREATE POLICY "Users can update their own votes" ON public.user_votes FOR UPDATE USING (auth.uid()::text = "userId");

-- Posts (public read, authenticated write)
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.uid()::text = author_id::text);

-- Post votes (public read, authenticated write)
DROP POLICY IF EXISTS "Post votes are viewable by everyone" ON public.post_votes;
CREATE POLICY "Post votes are viewable by everyone" ON public.post_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own post votes" ON public.post_votes;
CREATE POLICY "Users can manage their own post votes" ON public.post_votes FOR ALL USING (auth.uid()::text = user_id);

-- Gallery (public read, authenticated write) - uses snake_case: author_id
DROP POLICY IF EXISTS "Gallery images are viewable by everyone" ON public.gallery_images;
CREATE POLICY "Gallery images are viewable by everyone" ON public.gallery_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create gallery images" ON public.gallery_images;
CREATE POLICY "Authenticated users can create gallery images" ON public.gallery_images FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own gallery images" ON public.gallery_images;
CREATE POLICY "Users can update their own gallery images" ON public.gallery_images FOR UPDATE USING (auth.uid()::text = author_id::text);

-- Gallery votes (public read, authenticated write)
DROP POLICY IF EXISTS "Gallery votes are viewable by everyone" ON public.gallery_votes;
CREATE POLICY "Gallery votes are viewable by everyone" ON public.gallery_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own gallery votes" ON public.gallery_votes;
CREATE POLICY "Users can manage their own gallery votes" ON public.gallery_votes FOR ALL USING (auth.uid()::text = user_id);

-- Comments (public read, authenticated write) - uses snake_case: author_id
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING (auth.uid()::text = author_id::text);

-- Comment likes (public read, authenticated write)
DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON public.comment_likes;
CREATE POLICY "Comment likes are viewable by everyone" ON public.comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own comment likes" ON public.comment_likes;
CREATE POLICY "Users can manage their own comment likes" ON public.comment_likes FOR ALL USING (auth.uid()::text = user_id);

-- Users (limited read, users can update their own)
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid()::text = id::text);

-- User games (users can manage their own) - uses camelCase: userId, gameId
DROP POLICY IF EXISTS "User games are viewable by everyone" ON public.user_games;
CREATE POLICY "User games are viewable by everyone" ON public.user_games FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own games" ON public.user_games;
CREATE POLICY "Users can manage their own games" ON public.user_games FOR ALL USING (auth.uid()::text = "userId");

-- Friendships (users can see their own) - uses camelCase: userId, friendId
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships" ON public.friendships FOR SELECT USING (auth.uid()::text = "userId" OR auth.uid()::text = "friendId");

DROP POLICY IF EXISTS "Users can manage their own friendships" ON public.friendships;
CREATE POLICY "Users can manage their own friendships" ON public.friendships FOR ALL USING (auth.uid()::text = "userId");

-- Follows (public read, authenticated write) - uses camelCase: followerId, followingId
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own follows" ON public.follows;
CREATE POLICY "Users can manage their own follows" ON public.follows FOR ALL USING (auth.uid()::text = "followerId");

-- Follow requests (users can see their own) - uses camelCase: requesterId, targetId
DROP POLICY IF EXISTS "Users can view their own follow requests" ON public.follow_requests;
CREATE POLICY "Users can view their own follow requests" ON public.follow_requests FOR SELECT USING (auth.uid()::text = "requesterId" OR auth.uid()::text = "targetId");

DROP POLICY IF EXISTS "Users can manage their own follow requests" ON public.follow_requests;
CREATE POLICY "Users can manage their own follow requests" ON public.follow_requests FOR ALL USING (auth.uid()::text = "requesterId");

-- Chats (users can see their own)
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
CREATE POLICY "Users can view their own chats" ON public.chats FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE "chatId" = chats.id 
    AND "userId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Authenticated users can create chats" ON public.chats;
CREATE POLICY "Authenticated users can create chats" ON public.chats FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Chat participants (users can see their own) - uses camelCase: userId, chatId
DROP POLICY IF EXISTS "Users can view their own chat participants" ON public.chat_participants;
CREATE POLICY "Users can view their own chat participants" ON public.chat_participants FOR SELECT USING ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS "Users can manage their own chat participation" ON public.chat_participants;
CREATE POLICY "Users can manage their own chat participation" ON public.chat_participants FOR ALL USING ("userId" = auth.uid()::text);

-- Messages (users can see messages in their chats)
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE "chatId" = messages."chatId" 
    AND "userId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Authenticated users can create messages" ON public.messages;
CREATE POLICY "Authenticated users can create messages" ON public.messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Catan nominations (public read, authenticated write)
DROP POLICY IF EXISTS "Catan nominations are viewable by everyone" ON public.catan_nominations;
CREATE POLICY "Catan nominations are viewable by everyone" ON public.catan_nominations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create nominations" ON public.catan_nominations;
CREATE POLICY "Authenticated users can create nominations" ON public.catan_nominations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Catan nomination votes (public read, authenticated write) - uses camelCase: userId, nominationId
DROP POLICY IF EXISTS "Catan votes are viewable by everyone" ON public.catan_nomination_votes;
CREATE POLICY "Catan votes are viewable by everyone" ON public.catan_nomination_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own votes" ON public.catan_nomination_votes;
CREATE POLICY "Users can manage their own votes" ON public.catan_nomination_votes FOR ALL USING (auth.uid()::text = "userId");

-- Boardle hints (public read, admin write)
DROP POLICY IF EXISTS "Boardle hints are viewable by everyone" ON public.boardle_hints;
CREATE POLICY "Boardle hints are viewable by everyone" ON public.boardle_hints FOR SELECT USING (true);

-- Pixel canvas (public read, authenticated write)
DROP POLICY IF EXISTS "Pixel canvas is viewable by everyone" ON public.pixel_canvas;
CREATE POLICY "Pixel canvas is viewable by everyone" ON public.pixel_canvas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can update pixels" ON public.pixel_canvas;
CREATE POLICY "Authenticated users can update pixels" ON public.pixel_canvas FOR UPDATE WITH CHECK (auth.role() = 'authenticated');

-- Pixel placements (public read, authenticated write)
DROP POLICY IF EXISTS "Pixel placements are viewable by everyone" ON public.pixel_placements;
CREATE POLICY "Pixel placements are viewable by everyone" ON public.pixel_placements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create placements" ON public.pixel_placements;
CREATE POLICY "Authenticated users can create placements" ON public.pixel_placements FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Pixel cooldowns (users can see their own)
DROP POLICY IF EXISTS "Users can view their own cooldowns" ON public.pixel_cooldowns;
CREATE POLICY "Users can view their own cooldowns" ON public.pixel_cooldowns FOR SELECT USING (user_id = auth.uid()::text);

-- Canvas snapshots (public read, authenticated write)
DROP POLICY IF EXISTS "Canvas snapshots are viewable by everyone" ON public.canvas_snapshots;
CREATE POLICY "Canvas snapshots are viewable by everyone" ON public.canvas_snapshots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create snapshots" ON public.canvas_snapshots;
CREATE POLICY "Authenticated users can create snapshots" ON public.canvas_snapshots FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- User XP (public read, system write)
DROP POLICY IF EXISTS "User XP is viewable by everyone" ON public.user_xp;
CREATE POLICY "User XP is viewable by everyone" ON public.user_xp FOR SELECT USING (true);

-- XP history (users can see their own)
DROP POLICY IF EXISTS "Users can view their own XP history" ON public.xp_history;
CREATE POLICY "Users can view their own XP history" ON public.xp_history FOR SELECT USING (user_id = auth.uid()::text);

-- Two factor codes (users can see their own) - uses camelCase: userId
DROP POLICY IF EXISTS "Users can view their own 2FA codes" ON public.two_factor_codes;
CREATE POLICY "Users can view their own 2FA codes" ON public.two_factor_codes FOR SELECT USING ("userId" = auth.uid()::text);

DROP POLICY IF EXISTS "Users can manage their own 2FA codes" ON public.two_factor_codes;
CREATE POLICY "Users can manage their own 2FA codes" ON public.two_factor_codes FOR ALL USING ("userId" = auth.uid()::text);

-- Reports (authenticated users can create, admins can view)
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
CREATE POLICY "Authenticated users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 2. FIX PERMISSIVE RLS POLICIES
-- ============================================

-- Fix game_shop_items UPDATE policy (add USING clause)
DROP POLICY IF EXISTS "Authenticated users can update shop items" ON public.game_shop_items;
CREATE POLICY "Authenticated users can update shop items" 
  ON public.game_shop_items 
  FOR UPDATE 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Note: pending_registrations policy is intentionally permissive for service role
-- This is acceptable as it's meant for backend operations only

-- ============================================
-- 3. FIX FUNCTION SEARCH_PATH WARNINGS
-- ============================================

-- Fix get_games_by_best_names function
CREATE OR REPLACE FUNCTION public.get_games_by_best_names(_names text[])
RETURNS SETOF public.games
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT g.*
  FROM public.games g
  WHERE g.best_name_norm = ANY(_names)
$$;

-- Fix get_games_by_best_names_ordered function
CREATE OR REPLACE FUNCTION public.get_games_by_best_names_ordered(_names text[])
RETURNS SETOF public.games
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH input AS (
    SELECT n, ord
    FROM unnest(_names) WITH ORDINALITY AS t(n, ord)
  ),
  ids AS (
    SELECT g.id, i.ord
    FROM input i
    JOIN public.games g
      ON g.best_name_norm = i.n
  )
  SELECT g.*
  FROM ids
  JOIN public.games g USING (id)
  ORDER BY ids.ord
$$;
