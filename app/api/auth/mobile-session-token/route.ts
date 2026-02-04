import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Returns the current session as { token, user } for the mobile app.
 * Used after OAuth in a WebView: the page has the auth cookie, calls this,
 * then sends the token to the app via postMessage.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const result = await getUserFromToken(token);
  if (!result.success || !result.user) {
    return NextResponse.json({ error: result.message || 'Invalid session' }, { status: 401 });
  }
  return NextResponse.json({ token, user: result.user });
}
