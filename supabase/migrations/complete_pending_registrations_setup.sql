-- Complete setup for pending_registrations table
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- STEP 1: Create the pending_registrations table
-- ============================================

CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id TEXT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  verification_code_id TEXT,
  verification_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Add unique constraints to prevent duplicate registrations
  CONSTRAINT unique_pending_username UNIQUE (username),
  CONSTRAINT unique_pending_email UNIQUE (email)
);

-- Create index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_pending_registrations_expires_at ON public.pending_registrations(expires_at);

-- Create index for code lookup
CREATE INDEX IF NOT EXISTS idx_pending_registrations_code ON public.pending_registrations(verification_code);

-- Enable RLS (Row Level Security)
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (for API operations)
DROP POLICY IF EXISTS "Service role can manage pending registrations" ON public.pending_registrations;

CREATE POLICY "Service role can manage pending registrations"
  ON public.pending_registrations
  FOR ALL
  USING (true)
  WITH CHECK (true);

