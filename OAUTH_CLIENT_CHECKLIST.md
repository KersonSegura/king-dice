# OAuth Client Configuration Checklist

## ✅ Good News
Your OAuth app is **verified** by Google (green checkmark on verification page). This means the consent screen is properly configured.

## ⚠️ Still Need to Check: OAuth Client Settings

The `invalid_client` error means Google is rejecting the client credentials during the token exchange. This is usually because:

1. **Redirect URI doesn't match exactly**
2. **OAuth client type is wrong**
3. **Client secret mismatch** (but we verified this is correct)

## 🔍 Step-by-Step: Check OAuth Client Configuration

### Step 1: Go to Credentials
1. In Google Cloud Console, go to: **APIs & Services** → **Credentials**
2. Find the OAuth 2.0 Client ID that ends with: `...vkq2hr6f`
3. Click on it to edit/view details

### Step 2: Verify Client Type
**Must be:** "Web application" (NOT "Desktop app" or "Other")

If it's not "Web application":
- You'll need to create a new OAuth client with type "Web application"
- Use the new client ID and secret in Vercel

### Step 3: Verify Authorized Redirect URIs
**Must include exactly** (copy-paste this to avoid typos):
```
https://kingdice.gg/api/auth/callback/google
```

**Checklist:**
- ✅ Uses `https://` (not `http://`)
- ✅ No `www.` prefix
- ✅ No trailing slash `/`
- ✅ Exact path: `/api/auth/callback/google`
- ✅ Case-sensitive (all lowercase is correct)

**Common mistakes:**
- ❌ `http://kingdice.gg/api/auth/callback/google` (missing `s`)
- ❌ `https://kingdice.gg/api/auth/callback/google/` (trailing slash)
- ❌ `https://www.kingdice.gg/api/auth/callback/google` (extra `www`)
- ❌ `https://kingdice.gg/api/auth/callback/Google` (capital G)
- ✅ `https://kingdice.gg/api/auth/callback/google` (CORRECT)

### Step 4: Verify Client Secret
1. Click "Show" next to the client secret
2. Verify it ends with: `SuD5`
3. If it doesn't match, either:
   - Update Vercel with the correct secret, OR
   - Regenerate the secret in Google Cloud Console and update Vercel

### Step 5: Save Changes
- If you made any changes, click **"Save"**
- Wait 1-2 minutes for changes to propagate

## 🧪 Test After Changes

1. **Redeploy** your Vercel application (if you changed environment variables)
2. Visit: `https://kingdice.gg/api/auth/test-redirect`
   - This shows the exact redirect URI NextAuth is using
   - Verify it matches what's in Google Cloud Console
3. Try signing in with Google
4. Check Vercel logs for any errors

## 📋 Quick Verification Commands

After making changes, verify:

1. **Check credentials endpoint:**
   ```
   https://kingdice.gg/api/auth/check-credentials
   ```
   Should show client ID ending in `...vkq2hr6f` and secret ending in `SuD5`

2. **Check redirect URI:**
   ```
   https://kingdice.gg/api/auth/test-redirect
   ```
   Should show: `https://kingdice.gg/api/auth/callback/google`

3. **Compare with Google Cloud Console:**
   - The redirect URI from step 2 must match exactly what's in Google Cloud Console

## 🎯 Most Likely Issue

Based on the `invalid_client` error, the most common cause is:
- **Redirect URI mismatch** - The URI in Google Cloud Console doesn't match what NextAuth is sending

Double-check that the redirect URI in Google Cloud Console is **exactly**:
```
https://kingdice.gg/api/auth/callback/google
```

No trailing slash, no `www`, exact case.
