-- Add poll support for forum posts
-- This migration:
-- - Adds `post_type` and `poll` columns to `posts`
-- - Creates `post_poll_votes` table for community voting

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'text';

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS poll JSONB;

-- One vote per user per post (single-choice poll for now)
CREATE TABLE IF NOT EXISTS post_poll_votes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  post_id VARCHAR(255) NOT NULL,
  option_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_post_poll_votes_post_id ON post_poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_poll_votes_user_id ON post_poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_poll_votes_option_id ON post_poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_post_poll_votes_post_option ON post_poll_votes(post_id, option_id);

