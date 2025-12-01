/**
 * Script to generate OAuth 2.0 authorization URL
 * This script only shows the URL - use it to get the authorization code
 */

const { google } = require('googleapis');

const CLIENT_ID = '404642348674-7138cc5c375r881cbmtg2gpu465pccao.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://kingdice.gg/api/auth/google/callback';

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

console.log('\n📧 Gmail OAuth 2.0 Authorization URL\n');
console.log('='.repeat(80));
console.log(authUrl);
console.log('='.repeat(80));
console.log('\n📋 Instructions:');
console.log('1. Copy the URL above (the entire line between the ===)');
console.log('2. Paste it in your browser and press Enter');
console.log('3. Sign in with verify@kingdice.com');
console.log('4. Click "Allow" or "Permitir"');
console.log('5. After authorization, you will be redirected to:');
console.log('   https://kingdice.gg/api/auth/google/callback?code=XXXXX');
console.log('6. Copy the code from the URL (the part after code=)');
console.log('7. Run: node scripts/get-oauth-refresh-token.js');
console.log('8. Paste the code when prompted\n');

