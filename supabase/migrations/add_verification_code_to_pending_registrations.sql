-- Add verification_code column to pending_registrations table
-- This allows us to store the code directly without needing a userId link

ALTER TABLE public.pending_registrations 
ADD COLUMN IF NOT EXISTS verification_code TEXT;

-- Create index for code lookup
CREATE INDEX IF NOT EXISTS idx_pending_registrations_code ON public.pending_registrations(verification_code);

-- Make verification_code_id nullable since we're using verification_code directly now
ALTER TABLE public.pending_registrations 
ALTER COLUMN verification_code_id DROP NOT NULL;

