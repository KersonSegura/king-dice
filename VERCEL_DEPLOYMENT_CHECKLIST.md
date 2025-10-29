# Vercel Deployment Checklist

## ✅ Before Each Deployment

### 1. Environment Variables (CRITICAL)
Go to: Vercel Dashboard → Settings → Environment Variables

Verify these 6 variables are set for **ALL environments** (Production, Preview, Development):

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `DIRECT_URL` - Direct PostgreSQL connection (for migrations)
- [ ] `JWT_SECRET` - Random string for token signing
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### 2. Code Changes Required

✅ **Already Done:**
- [x] `prisma/schema.prisma` has `binaryTargets = ["native", "rhel-openssl-3.0.x"]`
- [x] `package.json` build script: `"build": "prisma generate && next build"`
- [x] `package.json` postinstall: `"postinstall": "prisma generate"`
- [x] Gallery image paths corrected
- [x] Boardle image paths corrected
- [x] Supabase domain added to `next.config.js`

### 3. Deploy Process

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Your message"
   git push origin main
   ```

2. **Or Trigger Redeploy in Vercel:**
   - Vercel Dashboard → Deployments → Latest
   - Click ⋯ → Redeploy

### 4. After Deployment - Verification

#### Check Build Logs
1. Go to Vercel Dashboard → Latest Deployment
2. Click "View Build Logs"
3. Search for:
   - ✅ "Running prisma generate"
   - ✅ "Generated Prisma Client"
   - ✅ "Creating an optimized production build"
   - ❌ No errors about "Query Engine" or "binaryTarget"

#### Test Endpoints (Open in Browser)

1. **Games API:**
   ```
   https://kingdice.gg/api/games/hotness?limit=6
   https://kingdice.gg/api/games/most-played?limit=6
   ```
   **Expected:** JSON response with games array
   **If 500:** Check Function Logs for Prisma error

2. **Authentication:**
   - Try logging in on the site
   - Check Vercel Function Logs for `/api/auth/login`
   - Should see: `🔐 authenticateUser: Starting authentication...`

3. **Images:**
   - Gallery images should load (check network tab)
   - Boardle images should work
   - No CORS errors in console

#### Check Function Logs

1. Vercel Dashboard → Your Project → Logs
2. Filter by function name (e.g., `/api/auth/login`)
3. Look for:
   - ✅ Success messages
   - ❌ Error messages (now with detailed logging)

## 🔧 If Things Still Don't Work

### Prisma Engine Error Still Appears

1. **Check Build Logs:**
   - Did `prisma generate` run? Look for it in the logs
   - Did it complete successfully?

2. **Verify Environment Variables:**
   - `DATABASE_URL` must be set (even if Prisma generate doesn't use it, it might check)

3. **Try Manual Redeploy:**
   - Vercel Dashboard → Deployments
   - Click the latest deployment
   - Click "Redeploy" (not just a new commit)

4. **Check Vercel Build Settings:**
   - Settings → General → Build & Development Settings
   - Framework Preset: Next.js
   - Build Command: `npm run build` (should auto-detect)
   - Install Command: `npm install` (should run postinstall automatically)

### Authentication Still Fails

1. **Clear Cookies:**
   - Browser DevTools → Application → Cookies
   - Delete all cookies for kingdice.gg
   - Try logging in again

2. **Try Registering New User:**
   - If registration works, old users might need password reset
   - If registration fails, it's a database/Prisma issue

3. **Check Function Logs:**
   - Look for the detailed error messages I added
   - They'll tell you if it's Prisma, JWT, or password related

### Games Still Not Loading

1. **Test API Directly:**
   - Open `/api/games/hotness?limit=6` in browser
   - If it returns JSON → API works, check frontend
   - If it returns 500 → Check Function Logs

2. **Check Database:**
   - Verify games exist in Supabase
   - Table: `Game`
   - Filter: `category = 'hotness'` or `'most-played'`

## 📊 Monitoring

### Key Metrics to Watch

1. **Function Response Times:**
   - Should be < 1 second for most APIs
   - If > 5 seconds, might be database connection issue

2. **Error Rates:**
   - Should be 0% for successful deployments
   - If high, check Function Logs

3. **Build Time:**
   - Should complete in 2-5 minutes
   - If longer, might indicate issues

### Useful Vercel Links

- **Project Dashboard:** https://vercel.com/dashboard
- **Function Logs:** Project → Logs tab
- **Deployments:** Project → Deployments tab
- **Environment Variables:** Project → Settings → Environment Variables

## 🆘 Emergency Rollback

If deployment breaks everything:

1. **Revert to Previous Deployment:**
   - Vercel Dashboard → Deployments
   - Find the last working deployment
   - Click ⋯ → "Promote to Production"

2. **Or Revert Git Commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

## ✅ Success Indicators

Your deployment is successful when:

- [ ] Build completes without errors
- [ ] `/api/games/hotness?limit=6` returns games JSON
- [ ] Login works (user can authenticate)
- [ ] Gallery images load
- [ ] Boardle images work
- [ ] Home page shows hot games and top-ranked games
- [ ] No Prisma errors in Function Logs

