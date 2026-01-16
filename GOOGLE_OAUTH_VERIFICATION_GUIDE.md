# Google OAuth Verification Guide

This guide will help you create the correct demo video for Google OAuth verification.

## What Google Needs to See in Your Video

Google needs two videos:

### Video 1: OAuth Consent Screen Workflow
This video must clearly show the Google OAuth consent screen that appears when users click "Sign in with Google".

### Video 2: App Functionality Demonstration
This video must show how your app actually uses the requested permissions.

---

## Step 1: Configure Google Cloud Console OAuth Consent Screen

Before recording, ensure your OAuth consent screen is properly configured:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **OAuth consent screen**
3. Make sure these scopes are added and visible:
   - `openid` - Sign in with Google
   - `email` - See your primary Google Account email address
   - `profile` - See your personal info, including any personal info you've made publicly available

4. Verify your app information:
   - **App name**: Should match your project name
   - **User support email**: Your email
   - **Developer contact information**: Your email

5. **Important**: If your app is in testing mode, add test users who will appear in the demo video

---

## Step 2: Record Video 1 - OAuth Consent Screen Workflow

### What to Record:

1. **Start with your application open** (preferably on the sign-in page)
2. **Show the "Sign in with Google" button clearly**
   - Make sure the button is visible and identifiable
   - You may want to highlight it or point to it

3. **Click the "Sign in with Google" button**

4. **CRITICAL**: Record the entire OAuth consent screen that appears, showing:
   - ✅ Your app name at the top (e.g., "King Dice wants to access your Google Account")
   - ✅ The Google account email being used
   - ✅ The permission scopes requested:
     - "See your primary Google Account email address"
     - "See your personal info, including any personal info you've made publicly available"
   - ✅ The "Allow" and "Cancel" buttons
   - ✅ The privacy policy link (if configured)

5. **Click "Allow"** and show the redirect back to your app

6. **Show successful sign-in** - User should be logged in after OAuth flow completes

### Tips for Recording:

- Use a screen recording tool (OBS, QuickTime, Windows Game Bar, etc.)
- Record in high resolution (1080p minimum)
- Speak clearly if narrating
- Show the URL bar so Google can verify it's the official Google OAuth domain
- Make sure the consent screen is fully visible (not cut off)
- Use a test account that's not your personal account (optional but recommended)

### Common Issues:

❌ **If the consent screen doesn't appear:**
- Make sure you're logged out of Google in that browser
- Use incognito/private mode
- Clear browser cookies
- Check that `prompt: 'consent'` is set in the OAuth config (it is)

❌ **If scopes are not visible:**
- Go to Google Cloud Console > OAuth consent screen
- Add scopes: `openid`, `email`, `profile`
- Wait a few minutes for changes to propagate
- Try again

---

## Step 3: Record Video 2 - App Functionality

This video should demonstrate how your app uses the Google sign-in functionality:

1. **Show the sign-in page** with Google button visible
2. **Click "Sign in with Google"** (can be brief, doesn't need to show full consent screen)
3. **After sign-in, demonstrate the app features** that require authentication:
   - User profile page
   - Any protected routes
   - User-specific data
   - Any features that use the user's email or profile info

4. **Show that the app actually uses the requested data**:
   - User's email address (displayed in profile)
   - User's name/avatar from Google (if applicable)
   - Any features that require authentication

### What to Highlight:

- ✅ User can successfully sign in with Google
- ✅ User data (email, profile) is used appropriately
- ✅ App functionality works as expected
- ✅ User can access protected features

---

## Step 4: Prepare Videos for Submission

1. **Video Format:**
   - MP4, MOV, or AVI format
   - High resolution (1080p recommended)
   - Maximum 5 minutes each (shorter is better)

2. **Video Hosting:**
   - Upload to YouTube (unlisted or public)
   - Or upload to Google Drive
   - Or use any video hosting service that provides a shareable link

3. **Privacy:**
   - Don't show any sensitive information
   - Use test accounts if possible
   - Blur any personal information if needed

---

## Step 5: Reply to Google

When you have both videos ready, reply to Google's email with:

```
Hello Google OAuth Verification Team,

Thank you for your feedback. I have addressed the issues mentioned:

1. OAuth Consent Screen Workflow Video:
   [Insert link to Video 1 showing the consent screen]

2. App Functionality Demonstration Video:
   [Insert link to Video 2 showing app functionality]

The videos demonstrate:
- Clear OAuth consent screen with all requested scopes (openid, email, profile)
- Proper workflow from clicking "Sign in with Google" to successful authentication
- How the app uses the requested permissions
- Core functionality of the application

Please let me know if you need any additional information.

Best regards,
[Your Name]
```

---

## Verification Checklist

Before submitting, ensure:

- [ ] OAuth consent screen is visible in Video 1
- [ ] All requested scopes are shown in the consent screen
- [ ] App name is clearly visible
- [ ] User email is shown (can be a test account)
- [ ] Complete OAuth flow is demonstrated (click button → consent screen → allow → sign in)
- [ ] App functionality is demonstrated in Video 2
- [ ] Videos are hosted and shareable
- [ ] Videos are under 5 minutes each
- [ ] No sensitive information is exposed

---

## Troubleshooting

### "Consent screen doesn't show all scopes"
- Go to Google Cloud Console > OAuth consent screen
- Click "Add or Remove Scopes"
- Add: `openid`, `email`, `profile`
- Save and wait 5-10 minutes

### "I'm automatically signed in, no consent screen"
- Sign out of Google in your browser
- Use incognito/private browsing mode
- The `prompt: 'consent'` parameter should force the consent screen

### "Scopes look different than expected"
- Make sure you're using the latest version of the code
- Check that `lib/auth-config.ts` has the correct scope configuration
- Restart your development server if needed

---

## Current Configuration

Your app is currently configured to request:
- `openid` - For authentication
- `email` - To get user's email address
- `profile` - To get user's basic profile information

These are standard scopes for user authentication and do not require sensitive scope verification.
