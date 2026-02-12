-- Secure auth: store only bcrypt hash; use one column name so login never fails with "column does not exist".
-- Normalizes only the password column to password_hash (snake_case). Other columns unchanged.
-- Run once in Supabase SQL Editor. Safe to run multiple times.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'passwordHash') THEN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text;
    UPDATE public.users SET password_hash = "passwordHash" WHERE "passwordHash" IS NOT NULL;
    ALTER TABLE public.users DROP COLUMN IF EXISTS "passwordHash";
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE public.users ADD COLUMN password_hash text;
  END IF;
END $$;

COMMENT ON COLUMN public.users.password_hash IS 'Bcrypt hash only; never expose in API responses.';
