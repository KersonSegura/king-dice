# Fix Google Consent Screen - Remove Email Sending Permission

## Problem
The consent screen still shows "King Dice wants to send emails on behalf of the users" even though you've updated the scopes.

## Solution
You need to update the **OAuth Consent Screen** configuration in Google Cloud Console, not just the code.

## Step-by-Step Fix

### Step 1: Go to Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **OAuth consent screen**

### Step 2: Check Current Scopes
1. Scroll down to **"Scopes"** section
2. Click **"ADD OR REMOVE SCOPES"**
3. You'll see all scopes currently configured

### Step 3: Remove Email Sending Scopes
**Remove these scopes if they're listed:**
- ❌ `https://www.googleapis.com/auth/gmail.send` (Send email)
- ❌ `https://www.googleapis.com/auth/gmail.compose` (Compose email)
- ❌ `https://mail.google.com/` (Full Gmail access)
- ❌ Any other email-sending related scopes

**Keep ONLY these scopes:**
- ✅ `openid` - Associate with personal info
- ✅ `https://www.googleapis.com/auth/userinfo.email` - See primary email
- ✅ `https://www.googleapis.com/auth/userinfo.profile` - See personal info

### Step 4: Save Changes
1. Click **"UPDATE"** or **"SAVE"**
2. Wait a few minutes for changes to propagate

### Step 5: Test with Fresh Account
1. **Revoke previous permissions** (important!):
   - Go to: https://myaccount.google.com/permissions
   - Find "King Dice" in the list
   - Click **"Remove Access"**
   
2. **Or use a different Google account** that hasn't granted permission yet

3. **Test sign-in again**:
   - Use incognito mode
   - Click "Sign in with Google"
   - The consent screen should now show only:
     - "See your primary Google Account email address"
     - "See your personal info, including any personal info you've made publicly available"
     - **NO email sending permissions!**

## Verify Your Code is Correct

Your code in `lib/auth-config.ts` should have:
```typescript
authorization: {
  params: {
    scope: 'openid email profile', // ✅ Correct - basic scopes only
  },
},
```

This is correct! The issue is in Google Cloud Console, not your code.

## Common Issues

### "I removed scopes but it still shows"
- **Wait 5-10 minutes** for Google to propagate changes
- **Revoke previous permissions** at https://myaccount.google.com/permissions
- **Use incognito mode** or a different account

### "I can't find where to remove scopes"
- Go to: **APIs & Services** > **OAuth consent screen**
- Scroll to **"Scopes"** section
- Click **"ADD OR REMOVE SCOPES"**
- Uncheck any email-sending scopes
- Click **"UPDATE"**

### "The scopes list is empty"
- Click **"ADD OR REMOVE SCOPES"**
- Search for and add:
  - `openid`
  - `userinfo.email`
  - `userinfo.profile`
- Save

## What the Consent Screen Should Show

✅ **Correct** (what you want):
- "See your primary Google Account email address"
- "See your personal info, including any personal info you've made publicly available"

❌ **Wrong** (what you're seeing):
- "Send email on your behalf"
- "Compose and send emails"
- Any Gmail-related permissions

## After Fixing

Once you've removed the email-sending scopes from Google Cloud Console:
1. Wait 5-10 minutes
2. Revoke previous permissions
3. Test sign-in
4. The consent screen should only show basic identity scopes

## Still Having Issues?

If after 10 minutes it still shows email-sending permissions:
1. Double-check the OAuth consent screen scopes in Google Cloud Console
2. Make sure you're testing with an account that has revoked permissions
3. Check that your code only requests `openid email profile` (which it does)
