# Vercel Environment Variables Setup Guide

## Where to Add Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project (King Dice)
3. Click **Settings** (gear icon in the top navigation)
4. Click **Environment Variables** in the left sidebar
5. Click **Add New** button

## Required Environment Variables

Add these **one by one** with the following names and values:

### 1. DATABASE_URL
```
postgresql://postgres.yoedvavdopxhehpxsvlt:Kinteligentesega7!@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 2. DIRECT_URL
```
postgresql://postgres.yoedvavdopxhehpxsvlt:Kinteligentesega7!@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

### 3. JWT_SECRET
```
kingdice-super-secure-jwt-secret-2024-production-ready
```
**OR** generate a secure random string (at least 32 characters)

### 4. SUPABASE_URL
```
https://yoedvavdopxhehpxsvlt.supabase.co
```

### 5. SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZWR2YXZkb3B4aGVocHhzdmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTIwNjgsImV4cCI6MjA3NDA4ODA2OH0.rXd04bEVxO3jsLA5g3TEZsHoBG5soD2YKN0TGnlDESo
```

### 6. SUPABASE_SERVICE_ROLE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZWR2YXZkb3B4aGVocHhzdmx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUxMjA2OCwiZXhwIjoyMDc0MDg4MDY4fQ.dPYTRZ2vMi5zZNbhKX51P3T-aYH-uhz8HtPAYnQIg3k
```

## Important Notes

- **Environment**: Select "Production", "Preview", and "Development" for all variables
- **After adding**: Click **Save** and then **Redeploy** your application
- **DATABASE_URL** and **DIRECT_URL** are from your Supabase project (same as production setup)
- **JWT_SECRET** should be a long, random string (you can use the one above or generate a new one)

## Optional Environment Variables

These are optional but might be needed:

- `OPENAI_API_KEY` - If you're using the AI chat bot
- `NODE_ENV=production` - Should be set automatically by Vercel

## After Adding Variables

1. Go to **Deployments** tab
2. Click the three dots (⋯) on the latest deployment
3. Click **Redeploy** 
4. This will trigger a new build with the environment variables

## Troubleshooting

- If authentication still fails, check Vercel Function Logs in the deployment details
- If Prisma errors persist, make sure `postinstall` script runs (it's already in package.json)
- Gallery images failing (400) will be fixed after Supabase URLs are properly configured

