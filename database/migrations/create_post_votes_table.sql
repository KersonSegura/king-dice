-- Create post_votes table for forum post voting
CREATE TABLE IF NOT EXISTS post_votes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  post_id VARCHAR(255) NOT NULL,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON post_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_vote_type ON post_votes(vote_type);
CREATE INDEX IF NOT EXISTS idx_post_votes_post_vote_type ON post_votes(post_id, vote_type);

-- Create gallery_votes table for gallery image voting
CREATE TABLE IF NOT EXISTS gallery_votes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  gallery_image_id VARCHAR(255) NOT NULL,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, gallery_image_id)
);

-- Create indexes for gallery_votes
CREATE INDEX IF NOT EXISTS idx_gallery_votes_gallery_image_id ON gallery_votes(gallery_image_id);
CREATE INDEX IF NOT EXISTS idx_gallery_votes_user_id ON gallery_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_votes_vote_type ON gallery_votes(vote_type);

-- Create comment_likes table for comment voting
CREATE TABLE IF NOT EXISTS comment_likes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  comment_id VARCHAR(255) NOT NULL,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

-- Create indexes for comment_likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_vote_type ON comment_likes(vote_type);

