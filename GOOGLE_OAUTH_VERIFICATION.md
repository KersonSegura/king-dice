# Google OAuth Setup Verification Checklist

## ✅ Step 1: Verify Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Required variables:**
- `GOOGLE_CLIENT_ID` = `YOUR_CLIENT_ID.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET` = `YOUR_CLIENT_SECRET`
- `NEXTAUTH_URL` = `https://kingdice.gg`
- `NEXTAUTH_SECRET` = (should be set, can be same as JWT_SECRET)

**⚠️ IMPORTANT:**
- Make sure there are **NO extra spaces** before or after the values
- Make sure the client secret is the **exact** value from Google Cloud Console
- If the secret was regenerated, make sure you're using the **newest** one

## ✅ Step 2: Verify Google Cloud Console Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find the OAuth 2.0 Client ID: `YOUR_CLIENT_ID`

**Check these settings:**

### A. Client Type
- Must be **"Web application"** (NOT "Desktop app" or "Other")
- If it's wrong, create a new client with type "Web application"

### B. Authorized redirect URIs
Must include **exactly** (case-sensitive, no trailing slash):
```
https://kingdice.gg/api/auth/callback/google
```

**Common mistakes:**
- ❌ `http://kingdice.gg/api/auth/callback/google` (missing `s` in `https`)
- ❌ `https://kingdice.gg/api/auth/callback/google/` (trailing slash)
- ❌ `https://www.kingdice.gg/api/auth/callback/google` (extra `www`)
- ✅ `https://kingdice.gg/api/auth/callback/google` (CORRECT)

### C. Client Secret
- Click "Show" next to the client secret
- Verify it matches the value in your Vercel environment variables
- If it doesn't match, you need to either:
  - Update Vercel with the correct secret, OR
  - Regenerate the secret in Google Cloud Console and update Vercel

### D. OAuth Consent Screen
- Go to **APIs & Services** → **OAuth consent screen**
- Verify it's set to **"External"** (not "Internal")
- Verify scopes are only:
  - `openid`
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`
- If in "Testing" mode, make sure your Google account is added as a test user

## ✅ Step 3: Verify Database Migration

The migration file `supabase/migrations/add_oauth_provider_columns.sql` should already be run.

**To verify it was applied:**
1. Go to Supabase Dashboard → SQL Editor
2. Run this query:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('provider', 'provider_id');
```

**Expected result:**
- Should return 2 rows: `provider` (varchar) and `provider_id` (varchar)
- If it returns 0 rows, run the migration:
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
```

## ✅ Step 4: Test After Changes

1. **Redeploy** your Vercel application after updating environment variables
2. Visit: `https://kingdice.gg/api/auth/check-credentials`
   - Should show the full client ID and confirm all credentials are set
3. Try signing in with Google
4. Check Vercel logs for any errors

## 🔍 Common Issues & Fixes

### Issue: `invalid_client (Unauthorized)`
**Causes:**
- Client ID and secret don't match
- Client secret was regenerated but Vercel wasn't updated
- Wrong OAuth client type (Desktop app instead of Web application)
- Redirect URI doesn't match exactly

**Fix:**
1. Double-check client ID and secret match exactly in both places
2. Verify redirect URI is exactly: `https://kingdice.gg/api/auth/callback/google`
3. Make sure OAuth client type is "Web application"

### Issue: `redirect_uri_mismatch`
**Cause:** Redirect URI in Google Cloud Console doesn't match what NextAuth is sending

**Fix:**
- Add exactly: `https://kingdice.gg/api/auth/callback/google` to Authorized redirect URIs

### Issue: User not created in database
**Cause:** Migration not run or `signIn` callback failing

**Fix:**
- Run the database migration (Step 3 above)
- Check Vercel logs for errors in the `signIn` callback

## 📝 What Happens When OAuth Works

1. User clicks "Sign in with Google"
2. Redirects to Google consent screen
3. User approves
4. Google redirects to: `https://kingdice.gg/api/auth/callback/google`
5. NextAuth exchanges code for tokens
6. `signIn` callback runs:
   - Checks if user exists by email
   - If not, creates new user with `provider: 'google'` and `provider_id`
   - If yes, signs in existing user
7. Redirects to your app with session established

## 🎯 Next Steps After Verification

Once everything is verified:
1. Test with a new Google account (should create new user)
2. Test with existing email (should sign in existing user)
3. Check database to verify `provider` and `provider_id` are stored
4. Remove debug logging if everything works
