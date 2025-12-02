/**
 * Script to get OAuth 2.0 refresh token using authorization code
 * 
 * Usage:
 * node scripts/get-refresh-token-with-code.js "YOUR_AUTHORIZATION_CODE"
 */

const { google } = require('googleapis');

// IMPORTANT: Set these as environment variables or edit this file with your credentials
// DO NOT commit real credentials to Git!
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://kingdice.gg/api/auth/google/callback';

if (!CLIENT_ID || !CLIENT_SECRET || CLIENT_ID === 'YOUR_CLIENT_ID_HERE' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET_HERE') {
  console.error('❌ Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET environment variables');
  console.error('   Example: GOOGLE_OAUTH_CLIENT_ID=xxx GOOGLE_OAUTH_CLIENT_SECRET=yyy node scripts/get-refresh-token-with-code.js "CODE"');
  process.exit(1);
}

// Get authorization code from command line argument
const authCode = process.argv[2];

if (!authCode) {
  console.error('❌ Please provide the authorization code as an argument');
  console.error('Usage: node scripts/get-refresh-token-with-code.js "YOUR_AUTHORIZATION_CODE"');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

console.log('\n📧 Getting OAuth 2.0 Refresh Token...\n');

oauth2Client.getToken(authCode, (err, token) => {
  if (err) {
    console.error('❌ Error retrieving access token:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
  
  if (!token.refresh_token) {
    console.error('❌ No refresh token received. Make sure you used prompt=consent');
    console.error('Token received:', token);
    process.exit(1);
  }
  
  console.log('✅ Success! Here are your OAuth 2.0 credentials:\n');
  console.log('='.repeat(80));
  console.log('Add these to your Vercel environment variables:\n');
  console.log(`GOOGLE_OAUTH_CLIENT_ID=${CLIENT_ID}`);
  console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${CLIENT_SECRET}`);
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${token.refresh_token}`);
  console.log(`GOOGLE_OAUTH_REDIRECT_URI=${REDIRECT_URI}`);
  console.log('='.repeat(80));
  console.log('\n⚠️  Keep these credentials secure! Never commit them to Git.\n');
  console.log('📋 Next steps:');
  console.log('1. Copy the GOOGLE_OAUTH_REFRESH_TOKEN above');
  console.log('2. Add all 4 variables to Vercel → Settings → Environment Variables');
  console.log('3. Redeploy your application');
  console.log('4. Test email sending by registering a new account\n');
});

