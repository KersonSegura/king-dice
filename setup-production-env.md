# Production Environment Setup

## Database Configuration Issue Fixed

The deployment error was caused by:
1. **Dynamic Server Usage**: Fixed by adding `export const dynamic = 'force-dynamic'` to auth verify route
2. **Database URL**: SQLite doesn't work in production, need to use PostgreSQL

## Environment Variables for Vercel

You need to set these environment variables in your Vercel dashboard:

### Required Environment Variables:
```
DATABASE_URL=postgresql://postgres.yoedvavdopxhehpxsvlt:Kinteligente7!@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.yoedvavdopxhehpxsvlt:Kinteligente7!@aws-1-us-east-2.pooler.supabase.com:5432/postgres
JWT_SECRET=kingdice-super-secure-jwt-secret-2024-production-ready
```

### Optional Environment Variables:
```
OPENAI_API_KEY=your-openai-api-key-here
SUPABASE_URL=your-supabase-url-here
SUPABASE_ANON_KEY=your-supabase-anon-key-here
NEXTAUTH_URL=https://kingdice.gg
NEXTAUTH_SECRET=your-random-secret-key-here
```

## Steps to Fix Deployment:

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Add the DATABASE_URL and DIRECT_URL** variables above
3. **Redeploy** your application
4. **Run database migration** in production

## Database Migration Commands:

After setting environment variables, run:
```bash
npx prisma db push
```

This will create the database schema in your Supabase PostgreSQL database.

## What Was Fixed:

1. ✅ **Dynamic Server Error**: Added `export const dynamic = 'force-dynamic'` to auth verify route
2. ✅ **Database Provider**: Changed from SQLite to PostgreSQL in schema.prisma
3. ✅ **Environment Variables**: Documented the required production environment variables

The authentication system will work once the environment variables are set in Vercel.
