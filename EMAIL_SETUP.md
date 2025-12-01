# Email Configuration for King Dice

This document explains how to configure email sending for account verification and other automated emails.

## Environment Variables

Add these variables to your `.env.local` file (for local development) or Vercel environment variables (for production):

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com          # Your SMTP server (Gmail, SendGrid, etc.)
SMTP_PORT=587                     # SMTP port (587 for TLS, 465 for SSL)
SMTP_USER=verify@kingdice.com     # Your SMTP username/email
SMTP_PASS=your-app-password       # Your SMTP password or app password

# Business Email Address
FROM_EMAIL=verify@kingdice.com     # Email address that sends verification emails
```

## Setup Instructions

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password as `SMTP_PASS`

3. **Configuration**:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=verify@kingdice.com
   SMTP_PASS=your-16-character-app-password
   FROM_EMAIL=verify@kingdice.com
   ```

### Option 2: Custom SMTP Server (Production)

If you have a custom email server for kingdice.com:

1. **Get SMTP credentials** from your email provider
2. **Configure**:
   ```
   SMTP_HOST=mail.kingdice.com    # Your SMTP server
   SMTP_PORT=587                   # Or 465 for SSL
   SMTP_USER=verify@kingdice.com
   SMTP_PASS=your-email-password
   FROM_EMAIL=verify@kingdice.com
   ```

### Option 3: Email Service Providers (Recommended for Production)

#### SendGrid
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
FROM_EMAIL=verify@kingdice.com
```

#### AWS SES
```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
FROM_EMAIL=verify@kingdice.com
```

#### Mailgun
```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
FROM_EMAIL=verify@kingdice.com
```

## Development Mode

If SMTP is not configured, the email service will:
- Save emails to `data/emails/` directory as HTML files
- Log email details to console
- **Not send actual emails**

This allows you to test the registration flow without configuring SMTP.

## Testing

1. **Local Development**: Emails are saved to `data/emails/` folder
2. **Production**: Emails are sent via SMTP to user's email address

## Email Types

The system sends the following emails:
- **Registration Verification**: Sent when a user creates an account
- **Two-Factor Authentication**: Sent when 2FA is enabled and user logs in

All emails are sent from `verify@kingdice.com` (or the email specified in `FROM_EMAIL`).



