# OAuth 2.0 Setup Guide for Gmail/Google Workspace Email

This guide will help you set up OAuth 2.0 authentication for sending emails from `verify@kingdice.com` using Google Workspace.

## Why OAuth 2.0?

- ✅ **Long-term solution**: Google is deprecating app passwords in March 2025
- ✅ **More secure**: Uses tokens instead of passwords
- ✅ **No expiration**: Tokens refresh automatically
- ✅ **Works with Google Workspace**: No restrictions on subsidiary accounts
- ✅ **Higher limits**: ~2,000 emails/day with Google Workspace

## Step 1: Create OAuth 2.0 Credentials in Google Cloud Console

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Select or Create a Project**:
   - If you have a project, select it
   - If not, create a new project (e.g., "King Dice Email")

3. **Enable Gmail API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Gmail API"
   - Click **Enable**

4. **Create OAuth 2.0 Credentials**:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - If prompted, configure the OAuth consent screen first:
     - **User Type**: Internal (for Google Workspace) or External
     - **App name**: King Dice Email Service
     - **User support email**: hello@kingdice.com
     - **Developer contact**: hello@kingdice.com
     - **Scopes**: Add `https://www.googleapis.com/auth/gmail.send`
     - **Test users**: Add `verify@kingdice.com` (if using External type)

5. **Configure OAuth Client**:
   - **Application type**: Web application
   - **Name**: King Dice Email Service
   - **Authorized redirect URIs**: 
     - For local: `http://localhost:3000/api/auth/google/callback`
     - For production: `https://kingdice.gg/api/auth/google/callback`
   - Click **Create**

6. **Save Credentials**:
   - Copy the **Client ID**
   - Copy the **Client Secret**
   - Save these securely (you'll need them for environment variables)

## Step 2: Get Refresh Token

You need to get a refresh token that will be used to generate access tokens automatically.

### Option A: Using a Script (Recommended)

1. **Create a script** to get the refresh token:

```javascript
// scripts/get-oauth-refresh-token.js
const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.send'],
  prompt: 'consent' // Force consent to get refresh token
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the code from that page here: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Refresh Token:', token.refresh_token);
    console.log('Full token object:', JSON.stringify(token, null, 2));
    rl.close();
  });
});
```

2. **Run the script**:
   ```bash
   node scripts/get-oauth-refresh-token.js
   ```

3. **Follow the instructions**:
   - Visit the URL shown
   - Sign in with `verify@kingdice.com`
   - Grant permissions
   - Copy the authorization code
   - Paste it into the script
   - Copy the **Refresh Token** that's displayed

### Option B: Using Google OAuth Playground

1. Go to: https://developers.google.com/oauthplayground/
2. Click the gear icon (⚙️) → Check "Use your own OAuth credentials"
3. Enter your **Client ID** and **Client Secret**
4. In the left panel, find "Gmail API v1" → Select `https://www.googleapis.com/auth/gmail.send`
5. Click "Authorize APIs"
6. Sign in with `verify@kingdice.com` and grant permissions
7. Click "Exchange authorization code for tokens"
8. Copy the **Refresh token** from the response

## Step 3: Update Environment Variables

Add these to your `.env.local` (for local) and Vercel (for production):

```bash
# OAuth 2.0 Configuration (Preferred method)
GOOGLE_OAUTH_CLIENT_ID=your-client-id-here
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret-here
GOOGLE_OAUTH_REFRESH_TOKEN=your-refresh-token-here
GOOGLE_OAUTH_REDIRECT_URI=https://kingdice.gg/api/auth/google/callback

# SMTP Configuration (Fallback if OAuth not configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=verify@kingdice.com
FROM_EMAIL=verify@kingdice.com
# SMTP_PASS is not needed when using OAuth 2.0
```

## Step 4: Install Dependencies

The code already includes `googleapis`. If you need to install it:

```bash
npm install googleapis
```

## Step 5: Test the Configuration

1. **Redeploy your application** in Vercel
2. **Try registering a new account**
3. **Check Vercel logs** - you should see:
   - `✅ OAuth 2.0 Service initialized`
   - `📧 Email Service: SMTP Configuration: { provider: 'Gmail (OAuth 2.0)' }`
   - `✅ Email sent successfully`

## Troubleshooting

### "Invalid grant" error
- The refresh token might be expired or invalid
- Generate a new refresh token using Step 2

### "Access denied" error
- Make sure `verify@kingdice.com` is added as a test user (if using External OAuth)
- Or switch to Internal OAuth type in Google Cloud Console

### OAuth not being used
- Check that all three OAuth environment variables are set
- Check logs for "OAuth 2.0 Service initialized"
- The system will fall back to SMTP_PASS if OAuth is not configured

## How It Works

1. **OAuth 2.0 Service** (`lib/oauth-service.ts`):
   - Manages OAuth tokens
   - Automatically refreshes access tokens when they expire
   - Provides credentials to the email service

2. **Email Service** (`lib/email-service.ts`):
   - Detects if OAuth 2.0 is configured
   - Uses OAuth tokens for authentication if available
   - Falls back to app passwords if OAuth is not configured

3. **Token Refresh**:
   - Access tokens expire after 1 hour
   - Refresh tokens are used to get new access tokens automatically
   - No manual intervention needed

## Security Notes

- **Never commit** OAuth credentials to Git
- Store them securely in environment variables
- Refresh tokens don't expire (unless revoked)
- Revoke tokens in Google Cloud Console if compromised

## Next Steps

After OAuth 2.0 is working:
- You can remove `SMTP_PASS` from environment variables
- The system will use OAuth 2.0 automatically
- No changes needed when Google deprecates app passwords in March 2025

