# Database Migration Guide: Local to Production

This guide will help you migrate all games from your local database to production.

## ⚠️ IMPORTANT: Read Before Starting

This process will **DELETE ALL EXISTING GAMES** in the production database and replace them with your local games. Make sure this is what you want!

## Step 1: Export Local Database

First, make sure you're connected to your **LOCAL** database:

```bash
# Your .env or .env.local should point to LOCAL database
# DATABASE_URL="postgresql://postgres:password@localhost:5432/reglas_de_mesa?schema=public"
```

Run the export script:

```bash
node scripts/export-all-games.js
```

This will create a file `scripts/games-export.json` with all your games.

**Expected output:**
- Total games count
- File size
- Games with descriptions/rules statistics

## Step 2: Backup Production Database (Recommended)

Before importing, it's good to backup the production database:

1. Go to Vercel Dashboard → Your Project → Storage → Postgres
2. Click on your database
3. Go to "Backups" tab and create a manual backup
4. Or use Vercel CLI: `vercel env pull .env.production`

## Step 3: Switch to Production Database

Update your `.env.local` or `.env` file to use the **PRODUCTION** database URL:

```bash
# Get production database URL from Vercel
# Option 1: From Vercel Dashboard
# Go to: Project Settings → Environment Variables → Copy DATABASE_URL and DIRECT_URL

# Option 2: Using Vercel CLI
vercel env pull .env.production
```

Then copy the production URLs to your `.env.local`:

```env
DATABASE_URL="postgres://default:xxx@xxx.vercel.com/xxx"
DIRECT_URL="postgres://default:xxx@xxx.vercel.com/xxx"
```

## Step 4: Verify Connection

Make sure Prisma is connected to production:

```bash
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM games;"
```

This should show the current number of games in production.

## Step 5: Run Import Script

⚠️ **FINAL WARNING**: This will delete all production games!

```bash
node scripts/import-games-to-production.js
```

The script will:
1. Wait 3 seconds (you can Ctrl+C to cancel)
2. Delete all existing games, categories, mechanics
3. Import categories and mechanics
4. Import all games with their descriptions, rules, and relationships

**Expected time**: 
- ~5-10 minutes for 200 games
- Progress updates every 50 games

## Step 6: Verify Import

Check that games are now on production:

```bash
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM games;"
```

Or visit: `https://kingdice.gg/boardgames`

## Step 7: Switch Back to Local Database

After successful import, switch your `.env.local` back to local:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/reglas_de_mesa?schema=public"
DIRECT_URL="postgresql://postgres:password@localhost:5432/reglas_de_mesa"
```

## Troubleshooting

### Error: "Export file not found"
Make sure you ran `export-all-games.js` first and the file exists at `scripts/games-export.json`

### Error: Connection timeout
Your production database might have connection limits. Try:
1. Close other connections
2. Run the script again (it will restart from scratch)

### Error: Unique constraint failed
This shouldn't happen with fresh import, but if it does:
1. The delete step might have failed
2. Try manually clearing the database first

### Import takes too long
The script shows progress every 50 games. For 200 games, expect ~5-10 minutes.

## Rollback (If Something Goes Wrong)

If the import fails or you need to rollback:

1. **Option 1**: Restore from Vercel backup
   - Go to Vercel Dashboard → Storage → Postgres → Backups
   - Restore the backup you created in Step 2

2. **Option 2**: Re-run the import script
   - Fix any issues
   - Run `node scripts/import-games-to-production.js` again
   - It will delete and re-import everything

## Notes

- The script preserves all game data: descriptions, rules, categories, mechanics, expansions
- Game IDs will be different in production (auto-generated)
- User data (votes, collections) is NOT affected if you have any
- The export file is plain JSON, you can inspect it before importing

## Quick Command Reference

```bash
# Step 1: Export local games
node scripts/export-all-games.js

# Step 2: Get production env
vercel env pull .env.production

# Step 3: Import to production (after updating DATABASE_URL)
node scripts/import-games-to-production.js

# Step 4: Verify
npx prisma studio  # Opens database viewer
```

---

**Questions?** Check the console output - the scripts provide detailed progress and error messages.

