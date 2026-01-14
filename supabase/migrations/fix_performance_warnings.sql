-- Fix performance warnings: auth_rls_initplan and multiple_permissive_policies
-- Run this in Supabase SQL Editor after fix_all_rls_policies_and_warnings.sql

-- ============================================
-- 1. FIX AUTH RLS INITPLAN WARNINGS
-- Replace auth.uid() and auth.role() with (select auth.uid()) and (select auth.role())
-- ============================================

-- User votes
DROP POLICY IF EXISTS "Users can insert their own votes" ON public.user_votes;
CREATE POLICY "Users can insert their own votes" ON public.user_votes FOR INSERT WITH CHECK ((select auth.uid())::text = "userId");

DROP POLICY IF EXISTS "Users can update their own votes" ON public.user_votes;
CREATE POLICY "Users can update their own votes" ON public.user_votes FOR UPDATE USING ((select auth.uid())::text = "userId");

-- Posts
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING ((select auth.uid())::text = author_id::text);

-- Post votes
DROP POLICY IF EXISTS "Users can manage their own post votes" ON public.post_votes;
CREATE POLICY "Users can manage their own post votes" ON public.post_votes FOR ALL USING ((select auth.uid())::text = user_id);

-- Gallery images
DROP POLICY IF EXISTS "Authenticated users can create gallery images" ON public.gallery_images;
CREATE POLICY "Authenticated users can create gallery images" ON public.gallery_images FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own gallery images" ON public.gallery_images;
CREATE POLICY "Users can update their own gallery images" ON public.gallery_images FOR UPDATE USING ((select auth.uid())::text = author_id::text);

-- Gallery votes
DROP POLICY IF EXISTS "Users can manage their own gallery votes" ON public.gallery_votes;
CREATE POLICY "Users can manage their own gallery votes" ON public.gallery_votes FOR ALL USING ((select auth.uid())::text = user_id);

-- Comments
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING ((select auth.uid())::text = author_id::text);

-- Comment likes
DROP POLICY IF EXISTS "Users can manage their own comment likes" ON public.comment_likes;
CREATE POLICY "Users can manage their own comment likes" ON public.comment_likes FOR ALL USING ((select auth.uid())::text = user_id);

-- Users
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING ((select auth.uid())::text = id::text);

-- User games
DROP POLICY IF EXISTS "Users can manage their own games" ON public.user_games;
CREATE POLICY "Users can manage their own games" ON public.user_games FOR ALL USING ((select auth.uid())::text = "userId");

-- Friendships
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships" ON public.friendships FOR SELECT USING ((select auth.uid())::text = "userId" OR (select auth.uid())::text = "friendId");

DROP POLICY IF EXISTS "Users can manage their own friendships" ON public.friendships;
CREATE POLICY "Users can manage their own friendships" ON public.friendships FOR ALL USING ((select auth.uid())::text = "userId");

-- Follows
DROP POLICY IF EXISTS "Users can manage their own follows" ON public.follows;
CREATE POLICY "Users can manage their own follows" ON public.follows FOR ALL USING ((select auth.uid())::text = "followerId");

-- Follow requests
DROP POLICY IF EXISTS "Users can view their own follow requests" ON public.follow_requests;
CREATE POLICY "Users can view their own follow requests" ON public.follow_requests FOR SELECT USING ((select auth.uid())::text = "requesterId" OR (select auth.uid())::text = "targetId");

DROP POLICY IF EXISTS "Users can manage their own follow requests" ON public.follow_requests;
CREATE POLICY "Users can manage their own follow requests" ON public.follow_requests FOR ALL USING ((select auth.uid())::text = "requesterId");

-- Chats
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
CREATE POLICY "Users can view their own chats" ON public.chats FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE "chatId" = chats.id 
    AND "userId" = (select auth.uid())::text
  )
);

DROP POLICY IF EXISTS "Authenticated users can create chats" ON public.chats;
CREATE POLICY "Authenticated users can create chats" ON public.chats FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- Chat participants
DROP POLICY IF EXISTS "Users can view their own chat participants" ON public.chat_participants;
CREATE POLICY "Users can view their own chat participants" ON public.chat_participants FOR SELECT USING ("userId" = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can manage their own chat participation" ON public.chat_participants;
CREATE POLICY "Users can manage their own chat participation" ON public.chat_participants FOR ALL USING ("userId" = (select auth.uid())::text);

-- Messages
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE "chatId" = messages."chatId" 
    AND "userId" = (select auth.uid())::text
  )
);

DROP POLICY IF EXISTS "Authenticated users can create messages" ON public.messages;
CREATE POLICY "Authenticated users can create messages" ON public.messages FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- Catan nominations
DROP POLICY IF EXISTS "Authenticated users can create nominations" ON public.catan_nominations;
CREATE POLICY "Authenticated users can create nominations" ON public.catan_nominations FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- Catan nomination votes
DROP POLICY IF EXISTS "Users can manage their own votes" ON public.catan_nomination_votes;
CREATE POLICY "Users can manage their own votes" ON public.catan_nomination_votes FOR ALL USING ((select auth.uid())::text = "userId");

-- Pixel canvas
DROP POLICY IF EXISTS "Authenticated users can update pixels" ON public.pixel_canvas;
CREATE POLICY "Authenticated users can update pixels" ON public.pixel_canvas FOR UPDATE WITH CHECK ((select auth.role()) = 'authenticated');

-- Pixel placements
DROP POLICY IF EXISTS "Authenticated users can create placements" ON public.pixel_placements;
CREATE POLICY "Authenticated users can create placements" ON public.pixel_placements FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- Pixel cooldowns
DROP POLICY IF EXISTS "Users can view their own cooldowns" ON public.pixel_cooldowns;
CREATE POLICY "Users can view their own cooldowns" ON public.pixel_cooldowns FOR SELECT USING (user_id = (select auth.uid())::text);

-- Canvas snapshots
DROP POLICY IF EXISTS "Authenticated users can create snapshots" ON public.canvas_snapshots;
CREATE POLICY "Authenticated users can create snapshots" ON public.canvas_snapshots FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- XP history
DROP POLICY IF EXISTS "Users can view their own XP history" ON public.xp_history;
CREATE POLICY "Users can view their own XP history" ON public.xp_history FOR SELECT USING (user_id = (select auth.uid())::text);

-- Two factor codes
DROP POLICY IF EXISTS "Users can view their own 2FA codes" ON public.two_factor_codes;
CREATE POLICY "Users can view their own 2FA codes" ON public.two_factor_codes FOR SELECT USING ("userId" = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can manage their own 2FA codes" ON public.two_factor_codes;
CREATE POLICY "Users can manage their own 2FA codes" ON public.two_factor_codes FOR ALL USING ("userId" = (select auth.uid())::text);

-- Reports
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
CREATE POLICY "Authenticated users can create reports" ON public.reports FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- Game shop items
DROP POLICY IF EXISTS "Authenticated users can create shop items" ON public.game_shop_items;
CREATE POLICY "Authenticated users can create shop items" ON public.game_shop_items FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update shop items" ON public.game_shop_items;
CREATE POLICY "Authenticated users can update shop items" 
  ON public.game_shop_items 
  FOR UPDATE 
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- Post poll votes
DROP POLICY IF EXISTS "Users can manage their own poll votes" ON public.post_poll_votes;
CREATE POLICY "Users can manage their own poll votes" ON public.post_poll_votes FOR ALL USING ((select auth.uid())::text = user_id);

-- ============================================
-- 2. FIX MULTIPLE PERMISSIVE POLICIES
-- Combine "viewable by everyone" and "users can manage their own" into single policies
-- ============================================

-- Catan nomination votes - combine SELECT policies
DROP POLICY IF EXISTS "Catan votes are viewable by everyone" ON public.catan_nomination_votes;
DROP POLICY IF EXISTS "Users can manage their own votes" ON public.catan_nomination_votes;
CREATE POLICY "Catan votes are viewable by everyone" ON public.catan_nomination_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own votes" ON public.catan_nomination_votes FOR ALL USING ((select auth.uid())::text = "userId");

-- Chat participants - combine SELECT policies
DROP POLICY IF EXISTS "Users can view their own chat participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can manage their own chat participation" ON public.chat_participants;
CREATE POLICY "Users can view their own chat participants" ON public.chat_participants FOR SELECT USING ("userId" = (select auth.uid())::text);
CREATE POLICY "Users can manage their own chat participation" ON public.chat_participants FOR ALL USING ("userId" = (select auth.uid())::text);

-- Comment likes - combine SELECT policies
DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can manage their own comment likes" ON public.comment_likes;
CREATE POLICY "Comment likes are viewable by everyone" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own comment likes" ON public.comment_likes FOR ALL USING ((select auth.uid())::text = user_id);

-- Follow requests - combine SELECT policies
DROP POLICY IF EXISTS "Users can view their own follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Users can manage their own follow requests" ON public.follow_requests;
CREATE POLICY "Users can view their own follow requests" ON public.follow_requests FOR SELECT USING ((select auth.uid())::text = "requesterId" OR (select auth.uid())::text = "targetId");
CREATE POLICY "Users can manage their own follow requests" ON public.follow_requests FOR ALL USING ((select auth.uid())::text = "requesterId");

-- Follows - combine SELECT policies
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Users can manage their own follows" ON public.follows;
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON public.follows FOR ALL USING ((select auth.uid())::text = "followerId");

-- Friendships - combine SELECT policies
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can manage their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships" ON public.friendships FOR SELECT USING ((select auth.uid())::text = "userId" OR (select auth.uid())::text = "friendId");
CREATE POLICY "Users can manage their own friendships" ON public.friendships FOR ALL USING ((select auth.uid())::text = "userId");

-- Gallery votes - combine SELECT policies
DROP POLICY IF EXISTS "Gallery votes are viewable by everyone" ON public.gallery_votes;
DROP POLICY IF EXISTS "Users can manage their own gallery votes" ON public.gallery_votes;
CREATE POLICY "Gallery votes are viewable by everyone" ON public.gallery_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own gallery votes" ON public.gallery_votes FOR ALL USING ((select auth.uid())::text = user_id);

-- Post poll votes - combine SELECT policies
DROP POLICY IF EXISTS "Post poll votes are viewable by everyone" ON public.post_poll_votes;
DROP POLICY IF EXISTS "Users can manage their own poll votes" ON public.post_poll_votes;
CREATE POLICY "Post poll votes are viewable by everyone" ON public.post_poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own poll votes" ON public.post_poll_votes FOR ALL USING ((select auth.uid())::text = user_id);

-- Post votes - combine SELECT policies
DROP POLICY IF EXISTS "Post votes are viewable by everyone" ON public.post_votes;
DROP POLICY IF EXISTS "Users can manage their own post votes" ON public.post_votes;
CREATE POLICY "Post votes are viewable by everyone" ON public.post_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own post votes" ON public.post_votes FOR ALL USING ((select auth.uid())::text = user_id);

-- Two factor codes - combine SELECT policies
DROP POLICY IF EXISTS "Users can view their own 2FA codes" ON public.two_factor_codes;
DROP POLICY IF EXISTS "Users can manage their own 2FA codes" ON public.two_factor_codes;
CREATE POLICY "Users can view their own 2FA codes" ON public.two_factor_codes FOR SELECT USING ("userId" = (select auth.uid())::text);
CREATE POLICY "Users can manage their own 2FA codes" ON public.two_factor_codes FOR ALL USING ("userId" = (select auth.uid())::text);

-- User games - combine SELECT policies
DROP POLICY IF EXISTS "User games are viewable by everyone" ON public.user_games;
DROP POLICY IF EXISTS "Users can manage their own games" ON public.user_games;
CREATE POLICY "User games are viewable by everyone" ON public.user_games FOR SELECT USING (true);
CREATE POLICY "Users can manage their own games" ON public.user_games FOR ALL USING ((select auth.uid())::text = "userId");
