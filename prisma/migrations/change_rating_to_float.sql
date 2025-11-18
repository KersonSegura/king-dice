-- Migration: Change user_votes.rating from INT to FLOAT
-- This allows storing decimal ratings (1-10 scale with 0.5 increments)

-- First, convert existing integer ratings to float (multiply by 1.0 to ensure float type)
ALTER TABLE user_votes 
ALTER COLUMN rating TYPE FLOAT USING rating::FLOAT;

