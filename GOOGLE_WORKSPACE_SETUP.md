# Google Workspace Email Setup for verify@kingdice.com

Since you created `verify@kingdice.com` on Google Workspace, here's what you need to do:

## ⚠️ IMPORTANT: Use App Password, Not Regular Password

For security, Google Workspace requires an **App Password** instead of your regular password when using SMTP. This is more secure and required for automated email sending.

## Step 1: Generate an App Password

1. **Go to your Google Account**: https://myaccount.google.com
2. **Navigate to Security** → **2-Step Verification** (you must have this enabled)
3. **Scroll down to "App passwords"**
4. **Click "App passwords"**
5. **Select app**: Choose "Mail"
6. **Select device**: Choose "Other (Custom name)" and type "King Dice Email Service"
7. **Click "Generate"**
8. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

## Step 2: Add Environment Variables

### For Local Development (`.env.local`):

Create or update `.env.local` in your project root:

```bash
# Google Workspace Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=verify@kingdice.com
SMTP_PASS=your-16-character-app-password-here
FROM_EMAIL=verify@kingdice.com
```

**Replace `your-16-character-app-password-here` with the App Password you generated in Step 1.**

### For Production (Vercel):

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project** (King Dice)
3. **Go to Settings** → **Environment Variables**
4. **Add these variables**:

   - **Name**: `SMTP_HOST` → **Value**: `smtp.gmail.com`
   - **Name**: `SMTP_PORT` → **Value**: `587`
   - **Name**: `SMTP_USER` → **Value**: `verify@kingdice.com`
   - **Name**: `SMTP_PASS` → **Value**: `your-16-character-app-password` (the one from Step 1)
   - **Name**: `FROM_EMAIL` → **Value**: `verify@kingdice.com`

5. **Redeploy your application** (Vercel will automatically redeploy when you add environment variables)

## Step 3: Test It

1. **Restart your local server** (if testing locally)
2. **Try registering a new account** on your site
3. **Check the `verify@kingdice.com` inbox** (and spam folder)
4. **You should receive a verification code email**

## Troubleshooting

### "Invalid login" or "Authentication failed"
- Make sure you're using the **App Password**, not your regular password
- The App Password is 16 characters (no spaces when you paste it)
- Make sure 2-Step Verification is enabled on your Google Account

### "Less secure app access" error
- Google Workspace doesn't use "less secure apps" anymore
- You **must** use App Passwords for SMTP
- Make sure 2-Step Verification is enabled

### Emails not sending
- Check that all environment variables are set correctly
- Verify the App Password is correct (regenerate if needed)
- Check spam folder
- Check Vercel logs for any errors

### Can't find "App passwords" option
- You need to have **2-Step Verification enabled** first
- Go to Security → 2-Step Verification → Enable it
- Then App passwords will appear

## Security Notes

- **Never commit your App Password to Git**
- **Never share your App Password**
- If you suspect it's compromised, regenerate it immediately
- App Passwords are safer than regular passwords because they're app-specific

## What's Already Configured

The email service is already set up to:
- ✅ Use Google Workspace SMTP settings
- ✅ Send from `verify@kingdice.com`
- ✅ Handle verification codes
- ✅ Work in both development and production

You just need to add the App Password to your environment variables!



