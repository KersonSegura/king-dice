# Pixel Canvas Database Setup

The pixel canvas has been migrated from file system storage to Supabase database. You need to run a SQL migration to create the required tables.

## Steps to Set Up

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**
   - Copy the entire contents of `database/migrations/create_pixel_canvas_tables.sql`
   - Paste it into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify Tables Were Created**
   - Go to "Table Editor" in the left sidebar
   - You should see three new tables:
     - `pixel_canvas` - Canvas metadata
     - `pixel_placements` - Individual pixel placements
     - `pixel_cooldowns` - User cooldown tracking

## What the Migration Creates

- **pixel_canvas**: Stores canvas dimensions and statistics
- **pixel_placements**: Stores each pixel with coordinates, color, and user info
- **pixel_cooldowns**: Tracks when users last placed a pixel (10-second cooldown)

## After Running the Migration

Once the tables are created, the pixel canvas should work immediately. You may need to refresh the page.

The canvas will start empty, and users can begin placing pixels with a 10-second cooldown between placements.

