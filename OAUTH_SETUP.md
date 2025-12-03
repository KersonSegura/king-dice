# OAuth Setup Guide

This guide will help you set up Google and Facebook OAuth authentication for King Dice.

## Prerequisites

- Google Cloud Console account
- Facebook Developer account

## Step 1: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - **IMPORTANT:** If you see "OAuth consent screen" first, configure it:
     - Choose "External" (NOT "Internal") - This allows any Google user to sign in
     - Fill in required fields (App name, User support email, Developer contact)
     - Add scopes: `email`, `profile`, `openid`
     - Add test users if in testing mode (optional)
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://kingdice.gg/api/auth/callback/google` (for production)
   - Click "Create"
   - Copy the **Client ID** and **Client Secret**

5. **If you get "Error 403: org_internal":**
   - This means your OAuth app is set to "Internal" instead of "External"
   - Go to "APIs & Services" > "OAuth consent screen"
   - Change "User Type" from "Internal" to "External"
   - Save and wait a few minutes for changes to propagate
   - Try signing in again

## Step 2: Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app:
   - Click "My Apps" > "Create App"
   - Choose "Consumer" as the app type
   - Fill in app details and create
3. Add Facebook Login:
   - In the app dashboard, click "Add Product"
   - Find "Facebook Login" and click "Set Up"
4. Configure OAuth settings:
   - Go to "Settings" > "Basic"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/facebook` (for development)
     - `https://kingdice.gg/api/auth/callback/facebook` (for production)
   - Copy the **App ID** and **App Secret**

## Step 3: Environment Variables

Add these environment variables to your Vercel project:

### Required Variables:
```
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
FACEBOOK_CLIENT_ID=your_facebook_app_id_here
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret_here
NEXTAUTH_SECRET=your_nextauth_secret_here (can use same as JWT_SECRET)
NEXTAUTH_URL=https://kingdice.gg (for production) or http://localhost:3000 (for development)
```

### How to Add in Vercel:
1. Go to your Vercel project dashboard
2. Navigate to "Settings" > "Environment Variables"
3. Add each variable for Production, Preview, and Development environments
4. Redeploy your application

## Step 4: Generate NEXTAUTH_SECRET

You can generate a secure secret using:
```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

## Testing

1. After adding environment variables, redeploy your application
2. Try signing in with Google or Facebook
3. Check that users are created in your database
4. Verify that JWT tokens are generated correctly

## Troubleshooting

### "Invalid redirect URI" error
- Make sure the redirect URIs in Google/Facebook match exactly
- Check that you're using the correct environment (localhost vs production)

### "Error 403: org_internal" (Google OAuth)
- Your Google OAuth app is set to "Internal" instead of "External"
- Go to Google Cloud Console > "APIs & Services" > "OAuth consent screen"
- Change "User Type" from "Internal" to "External"
- Save and wait a few minutes, then try again

### "OAuth sign-in failed: No email provided"
- Some OAuth providers require email scope to be requested
- Check that email permissions are enabled in your OAuth app settings

### Users not being created
- Check Vercel logs for errors
- Verify Supabase connection is working
- Check that the `users` table has the correct schema

## Notes

- OAuth users are automatically verified (no email verification needed)
- OAuth users don't have passwords (passwordHash is null)
- If a user signs in with OAuth using an email that already exists, the accounts will be linked
- The system generates a unique username from the OAuth provider's name or email

