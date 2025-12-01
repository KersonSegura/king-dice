/**
 * Script to get OAuth 2.0 refresh token for Gmail SMTP
 * 
 * Usage:
 * 1. Set CLIENT_ID and CLIENT_SECRET from Google Cloud Console
 * 2. Run: node scripts/get-oauth-refresh-token.js
 * 3. Visit the URL shown and authorize
 * 4. Copy the refresh token to your environment variables
 */

const { google } = require('googleapis');
const readline = require('readline');

// Get from Google Cloud Console → APIs & Services → Credentials
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '404642348674-7138cc5c375r881cbmtg2gpu465pccao.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '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';
const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://kingdice.gg/api/auth/google/callback';

if (CLIENT_ID === 'YOUR_CLIENT_ID' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET') {
  console.error('❌ Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET environment variables');
  console.error('   Or edit this script and set them directly');
  process.exit(1);
}

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

console.log('\n📧 Gmail OAuth 2.0 Setup\n');
console.log('1. Visit this URL to authorize:');
console.log(`   ${authUrl}\n`);
console.log('2. Sign in with verify@kingdice.com');
console.log('3. Grant permissions');
console.log('4. Copy the authorization code from the redirect URL\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the authorization code here: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('❌ Error retrieving access token:', err.message);
      rl.close();
      return;
    }
    
    console.log('\n✅ Success! Here are your OAuth 2.0 credentials:\n');
    console.log('Add these to your environment variables:\n');
    console.log(`GOOGLE_OAUTH_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${token.refresh_token}`);
    console.log(`GOOGLE_OAUTH_REDIRECT_URI=${REDIRECT_URI}`);
    console.log('\n⚠️  Keep these credentials secure! Never commit them to Git.\n');
    
    rl.close();
  });
});

