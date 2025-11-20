# How to Get Your Supabase Anon Key

## Quick Steps:

1. **Go to your Supabase Dashboard:**
   https://supabase.com/dashboard/project/yoedvavdopxhehpxsvlt/settings/api

2. **Find the "API Keys" section** - You'll see several keys:
   - **anon public** ← This is what you need!
   - **service_role** (already have this one)

3. **Copy the "anon public" key** - It looks like:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZWR2YXZkb3B4aGVocHhzdmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTIwNjgsImV4cCI6MjA3NDA4ODA2OH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. **Add it to `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Direct Link:
https://supabase.com/dashboard/project/yoedvavdopxhehpxsvlt/settings/api

## What Each Key Is For:

- **anon public** → Client-side (browser) - Safe to expose, used for RLS
- **service_role** → Server-side only - Full admin access, keep secret!

