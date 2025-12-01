# Fix Google Workspace SMTP Authentication for verify@kingdice.com

## Problem
Error: `535-5.7.8 Username and Password not accepted` when trying to send emails via SMTP from `verify@kingdice.com`.

## Root Cause
Google Workspace has admin-level restrictions that can prevent subsidiary accounts from using app passwords for SMTP authentication.

## Solution Steps

### Step 1: Enable "Less Secure Apps" Access (Admin Console)

1. Go to https://admin.google.com
2. Sign in as the **main admin account** (hello@kingdice.com)
3. Navigate to: **Security** → **Access and data control** → **Less secure app access**
4. Enable: **"Allow users to manage their access to less secure apps"**
5. Click **Save**

**Note:** Even though Google deprecated "Less Secure Apps", this setting still controls app password access for SMTP.

### Step 2: Verify Gmail is Enabled for verify@kingdice.com

1. In Google Admin Console, go to: **Apps** → **Google Workspace** → **Gmail**
2. Click on **User settings** or search for `verify@kingdice.com`
3. Ensure Gmail status is **"ON"** (not suspended or disabled)
4. If disabled, enable it

### Step 3: Enable IMAP for verify@kingdice.com

1. Sign in to `verify@kingdice.com` in a browser
2. Go to Gmail Settings: https://mail.google.com/mail/u/0/#settings/general
3. Click on **"Forwarding and POP/IMAP"** tab
4. Under **"IMAP access"**, select **"Enable IMAP"**
5. Click **"Save Changes"**

### Step 4: Check Organizational Unit (OU) Permissions

If `verify@kingdice.com` is in a different OU than the main account:

1. In Admin Console, go to: **Users** → Find `verify@kingdice.com`
2. Check which **Organizational Unit** it belongs to
3. Go to: **Security** → **2-Step Verification**
4. Ensure the OU allows:
   - Users can turn on 2-Step Verification
   - App passwords are allowed

### Step 5: Regenerate App Password

After making the above changes:

1. Sign in to `verify@kingdice.com`
2. Go to: https://myaccount.google.com/apppasswords
3. Delete any existing app passwords for "Mail"
4. Generate a **new** app password:
   - App: **Mail**
   - Device: **Other (Custom name)** → "King Dice SMTP"
5. Copy the 16-character password (without spaces)

### Step 6: Update Vercel Environment Variables

Update in Vercel:
- `SMTP_USER` = `verify@kingdice.com`
- `SMTP_PASS` = `new-16-character-app-password` (no spaces)
- `FROM_EMAIL` = `verify@kingdice.com`

### Step 7: Redeploy and Test

1. Redeploy your application in Vercel
2. Try registering a new account
3. Check Vercel logs for email sending status

## Alternative: Use OAuth2 Instead of App Passwords

If app passwords still don't work, you can use OAuth2:

1. Create OAuth2 credentials in Google Cloud Console
2. Use OAuth2 tokens instead of app passwords
3. More complex but more secure and reliable

## Still Not Working?

If none of the above works, the issue might be:
- Domain-level security policies
- Account suspension or restrictions
- IP-based restrictions

Consider using SendGrid or Mailgun as an alternative email service.

