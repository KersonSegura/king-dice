# Supabase Troubleshooting Guide

This guide helps you diagnose and fix Supabase connection issues, especially Cloudflare 522 errors.

## Quick Checklist

1. ✅ **Check Environment Variables** - Run `node scripts/check-supabase-config.js`
2. ✅ **Test Connection** - Run `node scripts/test-supabase-connection.js`
3. ✅ **Check Project Status** - Visit Supabase Dashboard
4. ✅ **Add Database Indexes** - Run migration `supabase/migrations/add_performance_indexes.sql`

## Common Issues

### Cloudflare 522: Connection Timeout

**Symptoms:**
- Error messages containing HTML (Cloudflare error page)
- "Connection timed out" errors
- Queries taking >30 seconds or timing out

**Causes:**
1. **Project is paused/sleeping** (most common on free tier)
2. **Database saturation** - too many connections or slow queries
3. **Missing indexes** - queries scanning full tables
4. **Network issues** - Cloudflare can't reach Supabase

**Solutions:**

#### 1. Wake Up Your Project
- Visit: https://supabase.com/dashboard
- Find your project
- If it shows "Paused" or "Sleeping", click "Resume" or "Wake Up"
- Wait 1-2 minutes for the project to fully start

#### 2. Add Database Indexes
Run the migration file in Supabase SQL Editor:
```sql
-- Copy contents of: supabase/migrations/add_performance_indexes.sql
-- Paste into: Supabase Dashboard > SQL Editor > New Query
-- Click "Run"
```

#### 3. Check Project Limits
- Visit: https://supabase.com/dashboard/project/[your-project]/settings/billing
- Check if you've hit connection limits
- Free tier: 500 max connections

#### 4. Verify Environment Variables
```bash
node scripts/check-supabase-config.js
```

## Step-by-Step Diagnosis

### Step 1: Check Configuration
```bash
node scripts/check-supabase-config.js
```

This will verify:
- All required environment variables are set
- URLs and keys are in correct format
- No missing credentials

### Step 2: Test Connection
```bash
node scripts/test-supabase-connection.js
```

This will:
- Test basic connectivity
- Query each main table
- Measure query performance
- Identify slow queries

### Step 3: Check Supabase Dashboard

1. **Project Status**
   - Go to: https://supabase.com/dashboard
   - Check if project shows "Active" (green) or "Paused" (yellow/red)
   - If paused, click "Resume"

2. **Database Logs**
   - Go to: Project > Logs > Postgres Logs
   - Look for slow queries (>5 seconds)
   - Check for connection errors

3. **API Logs**
   - Go to: Project > Logs > API Logs
   - Look for 500/522 errors
   - Check response times

4. **Performance Advisor**
   - Go to: Project > Database > Advisors
   - Run "Performance Advisor"
   - It will suggest missing indexes

### Step 4: Add Indexes

1. Open Supabase SQL Editor
2. Copy contents of `supabase/migrations/add_performance_indexes.sql`
3. Paste and run
4. Verify indexes were created:
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('users', 'posts', 'post_votes', 'gallery_images', 'gallery_votes', 'user_votes', 'games') 
ORDER BY tablename, indexname;
```

## Environment Variables

Required variables in `.env.local`:

```env
# Public (client-side)
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]

# Server-side (optional, uses public if not set)
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=[anon-key]

# Required for admin operations
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

**Where to find these:**
1. Go to: https://supabase.com/dashboard/project/[your-project]/settings/api
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## Performance Optimization

### Indexes Added

The migration adds indexes for:

- **Users**: `username`, `email`, `id` (for auth queries)
- **Posts**: `author_id`, `created_at` (for filtering and ordering)
- **Post Votes**: `post_id`, `user_id`, `vote_type` (for vote queries)
- **Gallery Images**: `author_id`, `category`, `created_at` (for filtering)
- **Gallery Votes**: `gallery_image_id`, `user_id` (for vote queries)
- **User Votes**: `gameId`, `userId` (for batch vote queries)
- **Games**: `nameEn`, `nameEs`, `yearRelease` (for search queries)

### Query Optimization Tips

1. **Use batch queries** - Already implemented in `/api/games/votes/batch`
2. **Limit results** - Always use `.limit()` on large tables
3. **Use indexes** - Filter by indexed columns when possible
4. **Avoid N+1 queries** - Batch related queries with `Promise.all()`

## Monitoring

### Check Query Performance

Run in Supabase SQL Editor:
```sql
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%FROM users%' OR query LIKE '%FROM posts%'
ORDER BY mean_time DESC
LIMIT 10;
```

### Check Connection Count

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();
```

### Check Table Sizes

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Getting Help

If issues persist:

1. **Check Supabase Status**: https://status.supabase.com
2. **Review Logs**: Supabase Dashboard > Logs
3. **Contact Support**: https://supabase.com/support
4. **Community**: https://github.com/supabase/supabase/discussions

## Prevention

To prevent future issues:

1. ✅ **Keep project active** - Free tier projects pause after inactivity
2. ✅ **Monitor connection count** - Stay under limits
3. ✅ **Add indexes early** - Before tables get large
4. ✅ **Use connection pooling** - Already implemented with singleton clients
5. ✅ **Monitor slow queries** - Review logs regularly

