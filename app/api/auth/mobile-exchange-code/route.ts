import { NextRequest, NextResponse } from 'next/server';
import { consumeMobileAuthCode } from '@/lib/mobile-auth-codes';

export const dynamic = 'force-dynamic';

/**
 * Exchange a one-time code for { token, user }.
 * Used by the mobile app's WebView after Google OAuth redirect to /auth/mobile-done?code=XXX,
 * so the app gets the session without relying on cookies (which often don't work in WebViews).
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }
  const data = consumeMobileAuthCode(code);
  if (!data) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
  }
  return NextResponse.json({ token: data.token, user: data.user });
}
