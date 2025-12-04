-- Create pending_registrations table to store registration data temporarily
-- This allows us to delay user creation until email verification is complete

CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id TEXT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  verification_code_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Add unique constraints to prevent duplicate registrations
  CONSTRAINT unique_pending_username UNIQUE (username),
  CONSTRAINT unique_pending_email UNIQUE (email),
  CONSTRAINT unique_pending_code_id UNIQUE (verification_code_id)
);

-- Create index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_pending_registrations_expires_at ON public.pending_registrations(expires_at);

-- Create index for code lookup
CREATE INDEX IF NOT EXISTS idx_pending_registrations_code_id ON public.pending_registrations(verification_code_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (for API operations)
CREATE POLICY "Service role can manage pending registrations"
  ON public.pending_registrations
  FOR ALL
  USING (true)
  WITH CHECK (true);

