# DIRECT_URL Options for Vercel

Based on your DATABASE_URL, here are two options for DIRECT_URL:

## Option 1: Same hostname, different port (Recommended to try first)
```
postgresql://postgres.yoedvavdopxhehpxsvlt:Kinteligentesega7!@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

## Option 2: Direct connection hostname (if Option 1 doesn't work)
Sometimes Supabase uses a different hostname for direct connections. If Option 1 doesn't work, try:
```
postgresql://postgres.yoedvavdopxhehpxsvlt:Kinteligentesega7!@aws-1-us-east-2.supabase.com:5432/postgres
```
(Note: removed "pooler" from the hostname)

## How to get the exact DIRECT_URL from Supabase:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Select **URI** tab (NOT "Connection pooling")
6. Copy that connection string - that's your DIRECT_URL

## To set in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name**: `DIRECT_URL`
   - **Value**: (use one of the options above, or get from Supabase)
   - **Environment**: Production (and Preview/Development)
3. Save and redeploy

## Safety:

✅ **DATABASE_URL stays unchanged** - used for regular queries (pgbouncer)
✅ **DIRECT_URL is new** - only used by Prisma when direct connection is needed
✅ **No impact on existing functionality** - all queries still use DATABASE_URL

