# Email Setup Guide for King Dice

This guide explains how to set up the `verify@kingdice.com` email address and configure it for sending verification emails.

## Step 1: Create the Email Address

You have several options for creating `verify@kingdice.com`:

### Option A: Using Your Domain Email Provider

If you own the `kingdice.com` domain, you can create the email address through:

1. **Your Domain Registrar** (if they provide email hosting)
   - Log into your domain registrar (GoDaddy, Namecheap, etc.)
   - Navigate to email settings
   - Create a new email address: `verify@kingdice.com`
   - Set a secure password

2. **Your Web Hosting Provider** (cPanel, Plesk, etc.)
   - Log into your hosting control panel
   - Go to Email Accounts
   - Create new email: `verify@kingdice.com`
   - Set a secure password

3. **Google Workspace / Microsoft 365**
   - If you have Google Workspace or Microsoft 365 for your domain
   - Add a new user: `verify@kingdice.com`
   - Set a secure password
   - Enable 2-factor authentication
   - Generate an app password for SMTP

### Option B: Using a Third-Party Email Service (Recommended)

For better deliverability and easier setup, use a professional email service:

#### 1. **SendGrid** (Recommended for Production)
   - Sign up at https://sendgrid.com
   - Verify your domain `kingdice.com`
   - Create a sender identity: `verify@kingdice.com`
   - Generate an API key
   - Use SMTP settings:
     ```
     SMTP_HOST=smtp.sendgrid.net
     SMTP_PORT=587
     SMTP_USER=apikey
     SMTP_PASS=your-sendgrid-api-key
     FROM_EMAIL=verify@kingdice.com
     ```

#### 2. **Mailgun**
   - Sign up at https://mailgun.com
   - Verify your domain `kingdice.com`
   - Use SMTP settings from Mailgun dashboard

#### 3. **AWS SES** (Amazon Simple Email Service)
   - Set up AWS SES
   - Verify your domain
   - Create SMTP credentials
   - Use AWS SES SMTP settings

#### 4. **Postmark**
   - Sign up at https://postmarkapp.com
   - Verify your domain
   - Use Postmark SMTP settings

### Option C: Gmail (For Development/Testing)

If you don't have the domain email set up yet, you can use Gmail temporarily:

1. **Create a Gmail account** (e.g., `kingdiceverify@gmail.com`)
2. **Enable 2-Factor Authentication**
3. **Generate an App Password**:
   - Go to Google Account → Security
   - 2-Step Verification → App passwords
   - Generate password for "Mail"
4. **Use these settings**:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=kingdiceverify@gmail.com
   SMTP_PASS=your-16-character-app-password
   FROM_EMAIL=verify@kingdice.com
   ```
   Note: The `FROM_EMAIL` can still be `verify@kingdice.com` even if sending from Gmail, but some email providers may reject this. For production, use a verified domain email.

## Step 2: Configure Environment Variables

Once you have your email set up, add these to your environment:

### For Local Development (`.env.local`):

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com              # Your SMTP server
SMTP_PORT=587                         # Port (587 for TLS, 465 for SSL)
SMTP_USER=verify@kingdice.com         # Your email username
SMTP_PASS=your-email-password         # Your email password or app password
FROM_EMAIL=verify@kingdice.com        # Display name for sent emails
```

### For Production (Vercel Environment Variables):

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `FROM_EMAIL`
4. Redeploy your application

## Step 3: Test the Email Configuration

1. **Development Mode** (without SMTP):
   - If SMTP is not configured, emails are saved to `data/emails/` folder
   - Check the folder to see if emails are being generated correctly

2. **Production Mode** (with SMTP):
   - Try registering a new account
   - Check your email inbox (and spam folder)
   - Verify the email comes from `verify@kingdice.com`

## Step 4: Email Provider Specific Settings

### Gmail
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password (16 characters)
```

### SendGrid
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Outlook/Office 365
```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=verify@kingdice.com
SMTP_PASS=your-password
```

### Custom SMTP Server
```
SMTP_HOST=mail.kingdice.com
SMTP_PORT=587 (or 465 for SSL)
SMTP_USER=verify@kingdice.com
SMTP_PASS=your-password
```

## Troubleshooting

### Emails not sending?
1. Check that all environment variables are set correctly
2. Verify SMTP credentials are correct
3. Check firewall/security settings
4. For Gmail: Make sure "Less secure app access" is enabled OR use App Passwords
5. Check spam folder - emails might be filtered

### "Authentication failed" error?
- Verify username and password are correct
- For Gmail: Use App Password, not regular password
- Check if 2FA is enabled (requires app password)

### Emails going to spam?
- Set up SPF, DKIM, and DMARC records for your domain
- Use a professional email service (SendGrid, Mailgun)
- Verify your domain with the email service

## Security Best Practices

1. **Never commit email passwords to Git**
   - Always use environment variables
   - Add `.env.local` to `.gitignore`

2. **Use App Passwords**
   - Don't use your main email password
   - Generate app-specific passwords

3. **Rotate Passwords Regularly**
   - Change email passwords periodically
   - Update environment variables when changed

4. **Monitor Email Activity**
   - Check email logs regularly
   - Set up alerts for failed sends

## Next Steps

Once email is configured:
1. Test registration flow
2. Verify emails are received
3. Check email formatting
4. Monitor for any delivery issues

For questions or issues, refer to the email service provider's documentation.



