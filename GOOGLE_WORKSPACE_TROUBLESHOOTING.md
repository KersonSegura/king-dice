# Google Workspace SMTP Troubleshooting - Additional Steps

## Current Status
- ✅ "Allow users to manage their access to less secure apps" is enabled for OU
- ✅ IMAP is enabled
- ✅ 2-Step Verification is enabled
- ✅ New app password generated
- ❌ Still getting 535-5.7.8 error

## Additional Steps to Try

### Step 1: Check Domain-Level Settings (Not Just OU)

The "less secure apps" setting might need to be enabled at the **domain/organization level**, not just the OU level:

1. Go to https://admin.google.com
2. Sign in as main admin (hello@kingdice.com)
3. Go to: **Security** → **Access and data control** → **Less secure app access**
4. Make sure you're viewing settings for the **entire organization** (not just the OU)
5. Enable: **"Allow users to manage their access to less secure apps"**
6. **Save** and wait 15-30 minutes for propagation

### Step 2: Verify Account Status

1. In Admin Console, go to: **Users** → Find `verify@kingdice.com`
2. Check:
   - Account status should be **"Active"** (not suspended)
   - Gmail service should be **"ON"**
   - No security alerts or restrictions

### Step 3: Check for Additional Security Policies

1. In Admin Console, go to: **Security** → **API controls**
2. Check if there are any restrictions on:
   - Third-party app access
   - API access
   - OAuth scopes

### Step 4: Try Moving Account to Main OU

If `verify@kingdice.com` is in a different OU than `hello@kingdice.com`:

1. In Admin Console, go to: **Users** → `verify@kingdice.com`
2. Click **Move to another organizational unit**
3. Move it to the same OU as `hello@kingdice.com` (or the root OU)
4. Wait 15-30 minutes
5. Try again

### Step 5: Wait for Settings Propagation

Google Workspace settings can take **15-30 minutes** to fully propagate. After making changes:
- Wait at least 30 minutes
- Generate a NEW app password
- Update Vercel
- Test again

### Step 6: Verify App Password is for Correct Account

1. Sign in to `verify@kingdice.com` (not hello@kingdice.com)
2. Go to: https://myaccount.google.com/apppasswords
3. Make sure you're signed in as `verify@kingdice.com`
4. Generate the app password from THIS account
5. Use this password in Vercel

### Step 7: Check Account Activity Logs

1. Sign in to `verify@kingdice.com`
2. Go to: https://myaccount.google.com/security
3. Check **Recent security activity**
4. Look for any blocked sign-in attempts
5. If you see blocked attempts, Google might be blocking SMTP access

## Alternative: Use OAuth2 Instead of App Passwords

If app passwords continue to fail, consider implementing OAuth2:

1. Create OAuth2 credentials in Google Cloud Console
2. Use OAuth2 tokens for authentication
3. More complex but more reliable for Google Workspace

## Recommendation

Given the persistent issues with Google Workspace subsidiary accounts, I recommend:

1. **Short-term**: Use your personal Gmail (kersonseguraarias@gmail.com) temporarily
2. **Long-term**: Set up SendGrid or Mailgun for professional email delivery

SendGrid/Mailgun advantages:
- ✅ Works immediately
- ✅ Better deliverability
- ✅ Professional appearance
- ✅ No Google Workspace restrictions
- ✅ Can send from verify@kingdice.com after domain verification

