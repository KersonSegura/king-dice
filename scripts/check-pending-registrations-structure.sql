-- Run this in Supabase SQL Editor to verify the migration worked

-- Check if the verification_code column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pending_registrations'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if the index was created
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename = 'pending_registrations'
  AND schemaname = 'public';

