import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/clear-for-mobile?callbackUrl=...
 * Clears all cookies for this origin (so the in-app browser has no saved session),
 * then redirects to /api/mobile-google with the same callbackUrl.
 * Use this as the "Try again" link when the user sees "Session expired" on mobile-done.
 */
export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') ?? '';
  const origin = request.nextUrl.origin;

  if (!callbackUrl) {
    return new NextResponse('Missing callbackUrl', { status: 400 });
  }

  const mobileGoogleUrl = `${origin}/api/mobile-google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const response = NextResponse.redirect(mobileGoogleUrl, 302);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Clear-Site-Data', '"cookies"');
  const clearCookie = (name: string) =>
    `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
  response.headers.append('Set-Cookie', clearCookie('auth_token'));
  response.headers.append('Set-Cookie', clearCookie('next-auth.session-token'));
  response.headers.append('Set-Cookie', clearCookie('__Secure-next-auth.session-token'));
  response.headers.append('Set-Cookie', clearCookie('__Secure-authjs.session-token'));
  response.headers.append('Set-Cookie', clearCookie('authjs.session-token'));
  return response;
}
