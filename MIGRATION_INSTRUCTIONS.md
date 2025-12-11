# How to Apply the Shop Items Migration

The `game_shop_items` table doesn't exist in production. You need to run the migration SQL in your Supabase dashboard.

## Steps:

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `supabase/migrations/add_amazon_url_to_games.sql`
4. Click **Run** to execute the migration

## What the migration does:

- Adds `amazonUrl` column to `games` table (if not exists)
- Creates `game_shop_items` table for storing multiple shop links per game
- Creates indexes for performance

## Alternative: Using Supabase CLI

If you have Supabase CLI set up, you can also run:

```bash
supabase db push
```

This will apply all pending migrations.

