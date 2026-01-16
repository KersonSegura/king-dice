-- Add OAuth provider columns to users table
-- This allows tracking which OAuth provider a user signed in with

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);

-- Add index for faster lookups by provider
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);

-- Add comment for documentation
COMMENT ON COLUMN users.provider IS 'OAuth provider name (e.g., "google", "facebook")';
COMMENT ON COLUMN users.provider_id IS 'User ID from the OAuth provider';
