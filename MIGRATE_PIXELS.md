# Migrate Old Pixel Canvas to Supabase

This script migrates your existing pixel canvas artwork from the local JSON file to the Supabase database.

## What it does:
- Reads all ~40,000 pixels from `data/pixel-canvas.json`
- Imports them into your Supabase `pixel_placements` table
- Preserves all artwork, user info, and timestamps
- Updates canvas statistics

## Storage Impact:
- 40,000 pixels = ~8-10 MB in database (very small!)
- This is less storage than 2-3 photos

## How to Run:

### Option 1: Using Node.js (Recommended)
```bash
node scripts/migrate-pixel-canvas.js
```

### Option 2: Using TypeScript
```bash
npx tsx scripts/migrate-pixel-canvas.ts
```

## Prerequisites:
1. Make sure you have run the SQL migration to create the tables (see PIXEL_CANVAS_SETUP.md)
2. Your `.env.local` file must have:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## What to Expect:
- The script will insert pixels in batches of 1,000
- For 40,000 pixels, expect ~40 batches
- Should complete in 2-5 minutes
- Progress is shown for each batch

## Safety:
- The script uses `upsert` with conflict resolution
- If a pixel already exists at coordinates (x,y), it will be updated
- The original JSON file is not modified
- You can run this script multiple times safely

## After Running:
- Refresh your pixel canvas page
- All your old artwork should appear!
- The canvas will show the correct pixel count and user count

