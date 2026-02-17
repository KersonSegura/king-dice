import { NextResponse } from 'next/server';

/**
 * Diagnostic endpoint to show what redirect URI NextAuth is using.
 * NextAuth builds redirect_uri from NEXTAUTH_URL; if that env is unset in production,
 * it uses the deployment URL (e.g. *.vercel.app) and Google returns redirect_uri_mismatch.
 *
 * This is at /api/verify-oauth (NOT /api/auth/) to avoid NextAuth conflicts.
 */
export async function GET() {
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const expectedRedirectUri = nextAuthUrl
    ? `${nextAuthUrl.replace(/\/$/, '')}/api/auth/callback/google`
    : 'NOT SET (NextAuth will use request host → wrong redirect_uri → Google Error 400)';

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const redirectUriMatches =
    nextAuthUrl &&
    expectedRedirectUri === 'https://kingdice.gg/api/auth/callback/google';

  return NextResponse.json({
    nextAuthUrl: nextAuthUrl || 'NOT SET',
    expectedRedirectUri,
    redirectUriMatchesGoogleConsole: redirectUriMatches,
    googleClientId: googleClientId || 'NOT SET',
    googleClientIdEndsWith: googleClientId ? googleClientId.substring(googleClientId.length - 20) : 'N/A',
    googleClientSecretConfigured: !!googleClientSecret,
    googleClientSecretEndsWith: googleClientSecret ? googleClientSecret.substring(googleClientSecret.length - 4) : 'N/A',
    message: nextAuthUrl
      ? 'If you still get redirect_uri_mismatch, ensure NEXTAUTH_URL has no trailing slash and matches exactly how users open the site (e.g. https://kingdice.gg).'
      : 'NEXTAUTH_URL is not set. Set it in your host (e.g. Vercel) to https://kingdice.gg so Google receives the correct redirect_uri.',
    fixRedirectUriMismatch: {
      step1: 'In your hosting (e.g. Vercel): Project → Settings → Environment Variables',
      step2: 'Add NEXTAUTH_URL = https://kingdice.gg (Production). No trailing slash.',
      step3: 'Redeploy so the new env is applied. Then try Google sign-in again.',
    },
    verification: {
      redirectUriShouldBe: 'https://kingdice.gg/api/auth/callback/google',
      redirectUriInGoogleConsole: 'https://kingdice.gg/api/auth/callback/google',
      clientIdShouldEndWith: '...vkq2hr6f',
      clientSecretShouldEndWith: 'SuD5',
      clientTypeShouldBe: 'Web application',
    },
  });
}
