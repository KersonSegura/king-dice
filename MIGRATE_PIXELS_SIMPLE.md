# Simple Pixel Canvas Migration

## Easy Method - API Endpoint (Recommended)

I've created an API endpoint that will migrate your 40,000 pixels automatically.

### Step 1: Check Current Status
Visit in your browser (or use curl):
```
https://kingdice.vercel.app/api/pixel-canvas/migrate
```

This will show you how many pixels are currently in the database.

### Step 2: Run the Migration
Use curl or Postman to POST to the endpoint with the secret:

```bash
curl -X POST https://kingdice.vercel.app/api/pixel-canvas/migrate \
  -H "Authorization: Bearer migrate-pixels-now-2025"
```

Or on Windows PowerShell:
```powershell
Invoke-WebRequest -Uri "https://kingdice.vercel.app/api/pixel-canvas/migrate" `
  -Method POST `
  -Headers @{"Authorization"="Bearer migrate-pixels-now-2025"}
```

### Step 3: Refresh Your Canvas
After the migration completes (2-5 minutes), refresh your pixel canvas page and all 40,000 pixels should appear!

## What Happens:
- Reads pixels from `data/pixel-canvas.json`
- Inserts them into Supabase in batches of 1,000
- Updates canvas statistics
- Shows progress in the response

## Safety:
- Uses `upsert` - safe to run multiple times
- Existing pixels will be updated, not duplicated
- Original JSON file is not modified

## Alternative: Local Script
If you prefer to run it locally, you need to:
1. Create `.env.local` with your Supabase credentials
2. Run: `node scripts/migrate-pixel-canvas.js`

(See MIGRATE_PIXELS.md for details)

