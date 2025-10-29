# Troubleshooting Guide

## Current Issues Being Fixed

### 1. Prisma Engine Not Found Error

**Error Message:**
```
Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x"
```

**Root Cause:** Vercel's serverless functions use a specific Linux runtime, and Prisma needs the correct binary target.

**Fixes Applied:**
- ✅ Added `binaryTargets = ["native", "rhel-openssl-3.0.x"]` to `prisma/schema.prisma`
- ✅ Build script includes `prisma generate` before `next build`
- ✅ `postinstall` script also runs `prisma generate`

**What to Check After Deployment:**

1. **In Vercel Dashboard → Your Deployment → Build Logs:**
   - Look for `Running "prisma generate"`
   - Should see: `Generated Prisma Client` 
   - Should NOT see errors about missing binaries

2. **If Prisma Generate Fails:**
   - Check that `DATABASE_URL` is set in Vercel environment variables
   - Verify `postinstall` script ran (should be in build logs)
   - Try manually running `npx prisma generate` locally and commit `node_modules/.prisma`

3. **If Prisma Generate Succeeds but Runtime Fails:**
   - The binary might not be bundled correctly
   - Check that `.vercelignore` doesn't exclude `node_modules/.prisma`

### 2. Authentication Failing

**Error:** "Authentication failed. Please try again."

**Possible Causes:**
1. Prisma connection failing (same as above)
2. `JWT_SECRET` not set or different between local and production
3. User doesn't exist or password is incorrect
4. Database connection issue

**Steps to Debug:**

1. **Check Vercel Function Logs:**
   - Go to: Vercel Dashboard → Deployment → Functions → `/api/auth/login`
   - Look for the detailed logs I added:
     - `🔐 authenticateUser: Starting authentication for: [username]`
     - `❌ Authentication error:` (if it fails)
     - Error details will show if it's Prisma, JWT, or password related

2. **Verify Environment Variables:**
   - `JWT_SECRET` must be set (any long random string)
   - `DATABASE_URL` must be correct Supabase connection string
   - `DIRECT_URL` must be set for migrations

3. **Test with Fresh User:**
   - Try registering a new account
   - If registration works but login doesn't, it's likely a password hashing issue
   - If registration fails, it's a database/Prisma issue

### 3. Games Not Loading (Hot Games / Top Ranked)

**Error:** 500 Internal Server Error with Prisma Query Engine message

**Same root cause as #1** - Prisma binary not available in runtime

**Additional Checks:**
- Verify games exist in database with `category = 'hotness'` or `'most-played'`
- Check that the API returns data (test `/api/games/hotness?limit=6` directly)
- Frontend might be handling empty responses incorrectly

### 4. Images Not Showing

**Status:** ✅ FIXED

- Gallery images: Path corrected to `gallery/gallery/{filename}`
- Boardle images: Paths corrected in API routes
- Supabase domain added to Next.js image config

**If images still don't work:**
- Check browser console for CORS errors
- Verify Supabase bucket is set to "Public"
- Check the image URL format matches what's in the database

## Manual Verification Steps

### Step 1: Check Build Process
1. Go to Vercel Dashboard → Latest Deployment
2. Click "View Build Logs"
3. Search for "prisma generate"
4. Should see:
   ```
   Environment variables loaded from .env
   Prisma schema loaded from prisma/schema.prisma
   Generated Prisma Client
   ```

### Step 2: Test API Endpoints Directly

Open these URLs in your browser (after deployment):

```
https://kingdice.gg/api/games/hotness?limit=6
https://kingdice.gg/api/games/most-played?limit=6
```

If you see JSON with games → ✅ APIs work
If you see 500 error → ❌ Check function logs for Prisma error

### Step 3: Check Function Logs

1. Vercel Dashboard → Your Project → Logs
2. Try logging in
3. Watch the logs for:
   - `🔐 Login attempt for: [username]`
   - `🔐 authenticateUser: Starting authentication...`
   - Any `❌` errors with details

## Quick Fixes

### If Prisma Still Fails After All Fixes:

1. **Regenerate Prisma Client Locally:**
   ```bash
   npx prisma generate
   ```

2. **Commit the generated files:**
   ```bash
   git add node_modules/.prisma
   git commit -m "Include Prisma binaries"
   ```

3. **But wait** - `node_modules/.prisma` is in `.gitignore`!

4. **Alternative:** Ensure Vercel build runs `prisma generate`:
   - Check `package.json` build script: `"build": "prisma generate && next build"`
   - Check `postinstall` script: `"postinstall": "prisma generate"`

### If Environment Variables Are the Issue:

1. Go to Vercel → Settings → Environment Variables
2. Verify all 6 variables are set:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `JWT_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **IMPORTANT:** Make sure they're set for **Production, Preview, AND Development**
4. Redeploy after adding/updating

### If Authentication Still Fails:

1. **Check JWT_SECRET matches:**
   - If you changed it in Vercel, all existing cookies are invalid
   - User must log out completely (clear cookies) and log in again

2. **Verify user exists in database:**
   - Go to Supabase Dashboard → Table Editor → `User` table
   - Check that user has `passwordHash` (not plain password)

3. **Try registering a new user:**
   - If registration works, old users might need password reset

## Contact Points

If issues persist after trying all above:
1. Share the exact error message from Vercel Function Logs
2. Share the build logs (specifically Prisma generation part)
3. Share what happens when you test the API endpoints directly

