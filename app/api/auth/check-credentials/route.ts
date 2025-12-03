import { NextResponse } from 'next/server';

/**
 * Endpoint to check if OAuth credentials are configured
 * This helps debug OAuth setup issues
 */
export async function GET() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const facebookClientId = process.env.FACEBOOK_CLIENT_ID;
  const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;

  return NextResponse.json({
    google: {
      clientId: googleClientId ? `${googleClientId.substring(0, 10)}...` : 'NOT SET',
      clientSecret: googleClientSecret ? 'SET' : 'NOT SET',
      configured: !!(googleClientId && googleClientSecret),
    },
    facebook: {
      clientId: facebookClientId ? `${facebookClientId.substring(0, 10)}...` : 'NOT SET',
      clientSecret: facebookClientSecret ? 'SET' : 'NOT SET',
      configured: !!(facebookClientId && facebookClientSecret),
    },
    nextAuth: {
      secret: nextAuthSecret ? 'SET' : 'NOT SET',
      url: nextAuthUrl || 'NOT SET',
    },
    allConfigured: !!(
      googleClientId &&
      googleClientSecret &&
      facebookClientId &&
      facebookClientSecret &&
      nextAuthSecret
    ),
  });
}

