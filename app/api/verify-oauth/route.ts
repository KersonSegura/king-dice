import { NextResponse } from 'next/server';

/**
 * Diagnostic endpoint to show what redirect URI NextAuth is using
 * This helps verify the redirect URI matches Google Cloud Console
 * 
 * Note: This is at /api/verify-oauth (NOT /api/auth/) to avoid NextAuth conflicts
 */
export async function GET() {
  const nextAuthUrl = process.env.NEXTAUTH_URL || 'https://kingdice.gg';
  const expectedRedirectUri = `${nextAuthUrl}/api/auth/callback/google`;
  
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  return NextResponse.json({
    nextAuthUrl,
    expectedRedirectUri,
    googleClientId: googleClientId || 'NOT SET',
    googleClientIdEndsWith: googleClientId ? googleClientId.substring(googleClientId.length - 20) : 'N/A',
    googleClientSecretConfigured: !!googleClientSecret,
    googleClientSecretEndsWith: googleClientSecret ? googleClientSecret.substring(googleClientSecret.length - 4) : 'N/A',
    message: '✅ Configuration looks correct! If still getting invalid_client error, try these steps:',
    troubleshooting: {
      step1: 'In Google Cloud Console, click "Save" even if you didn\'t make changes (forces refresh)',
      step2: 'Wait 2-3 minutes for changes to propagate',
      step3: 'Try signing in again in an incognito/private window',
      step4: 'Check Vercel logs for detailed error messages',
      step5: 'Verify the client secret in Google Cloud Console ends with: SuD5',
    },
    verification: {
      redirectUriShouldBe: expectedRedirectUri,
      redirectUriInGoogleConsole: 'https://kingdice.gg/api/auth/callback/google',
      clientIdShouldEndWith: '...vkq2hr6f',
      clientSecretShouldEndWith: 'SuD5',
      clientTypeShouldBe: 'Web application',
    },
  });
}
