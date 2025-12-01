# Quick Email Setup for verify@kingdice.com

Since you've created `verify@kingdice.com`, you just need to configure the SMTP settings. Here's how:

## Step 1: Find Your Email Provider's SMTP Settings

Your email provider (where you created verify@kingdice.com) should have SMTP settings. Common ones:

### If using cPanel / Most Web Hosts:
```
SMTP_HOST=mail.kingdice.com (or smtp.kingdice.com)
SMTP_PORT=587
SMTP_USER=verify@kingdice.com
SMTP_PASS=your-email-password
FROM_EMAIL=verify@kingdice.com
```

### If using Google Workspace:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=verify@kingdice.com
SMTP_PASS=app-password (generate from Google Account)
FROM_EMAIL=verify@kingdice.com
```

### If using Microsoft 365:
```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=verify@kingdice.com
SMTP_PASS=your-password
FROM_EMAIL=verify@kingdice.com
```

## Step 2: Add to Environment Variables

### For Local Development (`.env.local`):
```bash
SMTP_HOST=mail.kingdice.com
SMTP_PORT=587
SMTP_USER=verify@kingdice.com
SMTP_PASS=your-email-password-here
FROM_EMAIL=verify@kingdice.com
```

### For Production (Vercel):
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable:
   - `SMTP_HOST` = `mail.kingdice.com` (or your provider's SMTP server)
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = `verify@kingdice.com`
   - `SMTP_PASS` = `your-email-password`
   - `FROM_EMAIL` = `verify@kingdice.com`
3. Redeploy your application

## Step 3: Find Your SMTP Settings

**Where to find your SMTP settings:**

1. **Check your email provider's documentation** - They usually have a help page with SMTP settings
2. **Check your hosting control panel** (cPanel, Plesk, etc.) - Look for "Email Accounts" → "Configure Email Client"
3. **Check your domain registrar** - If they provide email, check their support docs
4. **Common SMTP servers:**
   - `mail.yourdomain.com`
   - `smtp.yourdomain.com`
   - `mail.yourhostingprovider.com`

## Step 4: Test

Once configured:
1. Try registering a new account
2. Check `verify@kingdice.com` inbox (and spam folder)
3. You should receive the verification code email

## Troubleshooting

**"Authentication failed" error:**
- Double-check the password is correct
- Some providers require an "app password" instead of regular password
- Make sure the username is the full email: `verify@kingdice.com`

**"Connection timeout" error:**
- Try port 465 with `secure: true` instead of 587
- Check if your firewall is blocking the connection
- Verify the SMTP_HOST is correct

**Emails not sending:**
- Check spam folder
- Verify SMTP credentials are correct
- Check email provider's sending limits

## Need Help?

If you tell me:
1. **Where you created the email** (cPanel, Google Workspace, etc.)
2. **Your hosting provider** (if applicable)

I can give you the exact SMTP settings to use!



