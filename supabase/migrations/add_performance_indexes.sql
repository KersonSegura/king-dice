-- Performance indexes for Supabase queries
-- This migration adds indexes to improve query performance and reduce timeout issues

-- ============================================
-- USERS TABLE INDEXES
-- ============================================
-- Index for authentication queries (username/email lookup)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Composite index for username/email OR queries
CREATE INDEX IF NOT EXISTS idx_users_username_email ON users(username, email);

-- ============================================
-- POSTS TABLE INDEXES
-- ============================================
-- Index for author filtering and ordering by creation date
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_id, created_at DESC);

-- Handle camelCase columns if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'authorId') THEN
        CREATE INDEX IF NOT EXISTS idx_posts_authorId ON posts("authorId");
        CREATE INDEX IF NOT EXISTS idx_posts_createdAt ON posts("createdAt" DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_authorId_createdAt ON posts("authorId", "createdAt" DESC);
    END IF;
END $$;

-- ============================================
-- POST_VOTES TABLE INDEXES
-- ============================================
-- Indexes for vote queries (most common queries)
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON post_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_vote_type ON post_votes(vote_type);
CREATE INDEX IF NOT EXISTS idx_post_votes_post_vote_type ON post_votes(post_id, vote_type);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_post ON post_votes(user_id, post_id);

-- ============================================
-- GALLERY_IMAGES TABLE INDEXES
-- ============================================
-- Index for author filtering and category filtering
CREATE INDEX IF NOT EXISTS idx_gallery_images_author_id ON gallery_images(author_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_category ON gallery_images(category);
CREATE INDEX IF NOT EXISTS idx_gallery_images_created_at ON gallery_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_images_author_category ON gallery_images(author_id, category);
CREATE INDEX IF NOT EXISTS idx_gallery_images_category_created ON gallery_images(category, created_at DESC);

-- Handle camelCase columns if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gallery_images' AND column_name = 'authorId') THEN
        CREATE INDEX IF NOT EXISTS idx_gallery_images_authorId ON gallery_images("authorId");
        CREATE INDEX IF NOT EXISTS idx_gallery_images_category_camel ON gallery_images(category);
        CREATE INDEX IF NOT EXISTS idx_gallery_images_createdAt ON gallery_images("createdAt" DESC);
        CREATE INDEX IF NOT EXISTS idx_gallery_images_authorId_category ON gallery_images("authorId", category);
        CREATE INDEX IF NOT EXISTS idx_gallery_images_category_createdAt ON gallery_images(category, "createdAt" DESC);
    END IF;
    
    -- Handle userId as alternative to authorId
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gallery_images' AND column_name = 'userId') THEN
        CREATE INDEX IF NOT EXISTS idx_gallery_images_userId ON gallery_images("userId");
        CREATE INDEX IF NOT EXISTS idx_gallery_images_userId_category ON gallery_images("userId", category);
    END IF;
END $$;

-- ============================================
-- GALLERY_VOTES TABLE INDEXES
-- ============================================
-- Indexes for gallery vote queries
CREATE INDEX IF NOT EXISTS idx_gallery_votes_image_id ON gallery_votes(gallery_image_id);
CREATE INDEX IF NOT EXISTS idx_gallery_votes_user_id ON gallery_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_votes_vote_type ON gallery_votes(vote_type);
CREATE INDEX IF NOT EXISTS idx_gallery_votes_user_image ON gallery_votes(user_id, gallery_image_id);

-- ============================================
-- USER_VOTES TABLE INDEXES
-- ============================================
-- Indexes for game voting queries (batch queries)
CREATE INDEX IF NOT EXISTS idx_user_votes_game_id ON user_votes("gameId");
CREATE INDEX IF NOT EXISTS idx_user_votes_user_id ON user_votes("userId");
CREATE INDEX IF NOT EXISTS idx_user_votes_user_game ON user_votes("userId", "gameId");
CREATE INDEX IF NOT EXISTS idx_user_votes_game_user ON user_votes("gameId", "userId");

-- Handle snake_case columns if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_votes' AND column_name = 'game_id') THEN
        CREATE INDEX IF NOT EXISTS idx_user_votes_game_id_snake ON user_votes(game_id);
        CREATE INDEX IF NOT EXISTS idx_user_votes_user_id_snake ON user_votes(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_votes_user_game_snake ON user_votes(user_id, game_id);
        CREATE INDEX IF NOT EXISTS idx_user_votes_game_user_snake ON user_votes(game_id, user_id);
    END IF;
END $$;

-- ============================================
-- GAMES TABLE INDEXES
-- ============================================
-- Indexes for game search queries (name searches are common)
CREATE INDEX IF NOT EXISTS idx_games_name_en ON games("nameEn");
CREATE INDEX IF NOT EXISTS idx_games_name_es ON games("nameEs");
CREATE INDEX IF NOT EXISTS idx_games_name ON games(name);
CREATE INDEX IF NOT EXISTS idx_games_year_release ON games("yearRelease");
CREATE INDEX IF NOT EXISTS idx_games_year_name ON games("yearRelease", "nameEn");

-- Text search indexes for ILIKE queries (PostgreSQL specific)
-- These help with case-insensitive searches
CREATE INDEX IF NOT EXISTS idx_games_name_en_lower ON games(LOWER("nameEn"));
CREATE INDEX IF NOT EXISTS idx_games_name_es_lower ON games(LOWER("nameEs"));
CREATE INDEX IF NOT EXISTS idx_games_name_lower ON games(LOWER(name));

-- Handle snake_case columns if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'name_en') THEN
        CREATE INDEX IF NOT EXISTS idx_games_name_en_snake ON games(name_en);
        CREATE INDEX IF NOT EXISTS idx_games_name_es_snake ON games(name_es);
        CREATE INDEX IF NOT EXISTS idx_games_year_release_snake ON games(year_release);
        CREATE INDEX IF NOT EXISTS idx_games_name_en_lower_snake ON games(LOWER(name_en));
        CREATE INDEX IF NOT EXISTS idx_games_name_es_lower_snake ON games(LOWER(name_es));
    END IF;
END $$;

-- ============================================
-- ANALYZE TABLES
-- ============================================
-- Update statistics for query planner
ANALYZE users;
ANALYZE posts;
ANALYZE post_votes;
ANALYZE gallery_images;
ANALYZE gallery_votes;
ANALYZE user_votes;
ANALYZE games;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries in Supabase SQL editor to verify indexes were created:
-- SELECT indexname, tablename FROM pg_indexes WHERE tablename IN ('users', 'posts', 'post_votes', 'gallery_images', 'gallery_votes', 'user_votes', 'games') ORDER BY tablename, indexname;

