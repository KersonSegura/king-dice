import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getCookieHeaderFromResponse(res: Response): string {
  const list = getAllSetCookies(res);
  return list
    .map((s) => {
      const idx = s.indexOf(';');
      return idx > 0 ? s.slice(0, idx).trim() : s.trim();
    })
    .filter(Boolean)
    .join('; ');
}

function getAllSetCookies(res: Response): string[] {
  try {
    const headers = res.headers as Headers & { getSetCookie?: () => string[] };
    if (typeof headers.getSetCookie === 'function') {
      return headers.getSetCookie();
    }
    const single = res.headers.get('set-cookie');
    if (single) return [single];
  } catch (_) {}
  return [];
}

/**
 * GET /api/mobile-apple?callbackUrl=...
 * Starts NextAuth Apple sign-in server-side and redirects to Apple OAuth.
 */
export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') ?? '';
  const requestOrigin = request.nextUrl.origin;
  const host = request.headers.get('host') || request.nextUrl.host;
  const origin =
    requestOrigin ||
    (host ? `https://${host}` : null) ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://www.kingdice.gg';

  if (!callbackUrl) {
    return new NextResponse(
      '<!DOCTYPE html><html><body><p>Missing callbackUrl</p></body></html>',
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const allSetCookies: string[] = [];
  const csrfUrl = `${origin}/api/auth/csrf`;
  const signinUrl = `${origin}/api/auth/signin/apple`;

  try {
    const csrfRes = await fetch(csrfUrl, { cache: 'no-store' });
    const csrfData = await csrfRes.json().catch(() => ({}));
    const csrfToken = typeof csrfData?.csrfToken === 'string' ? csrfData.csrfToken : '';
    allSetCookies.push(...getAllSetCookies(csrfRes));
    const cookieFromCsrf = getCookieHeaderFromResponse(csrfRes);

    if (!csrfToken) {
      console.error('[mobile-apple] No CSRF token', { status: csrfRes.status, origin: csrfUrl });
      return new NextResponse(
        '<!DOCTYPE html><html><body><p>Could not start sign-in. Try again.</p></body></html>',
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const postBody = new URLSearchParams({
      csrfToken,
      callbackUrl,
    });
    const signinRes = await fetch(signinUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(cookieFromCsrf ? { Cookie: cookieFromCsrf } : {}),
      },
      body: postBody.toString(),
      redirect: 'manual',
      cache: 'no-store',
    });
    allSetCookies.push(...getAllSetCookies(signinRes));

    const location = signinRes.headers.get('location');
    if (signinRes.status !== 302 || !location || !location.startsWith('http')) {
      console.error('[mobile-apple] Signin did not redirect', {
        status: signinRes.status,
        hasLocation: !!location,
        origin: signinUrl,
      });
      return new NextResponse(
        '<!DOCTYPE html><html><body><p>Sign-in could not start. Try again.</p></body></html>',
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const clearCookie = (name: string) =>
      `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
    const secure = origin.startsWith('https');
    const prefix = secure ? '__Secure-' : '';

    const response = NextResponse.redirect(location, 302);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.append('Set-Cookie', clearCookie('auth_token'));
    response.headers.append('Set-Cookie', clearCookie(`${prefix}next-auth.session-token`));
    response.headers.append('Set-Cookie', clearCookie('next-auth.session-token'));
    if (secure) {
      response.headers.append('Set-Cookie', clearCookie('__Secure-authjs.session-token'));
      response.headers.append('Set-Cookie', clearCookie('authjs.session-token'));
    }
    for (const cookie of allSetCookies) {
      response.headers.append('Set-Cookie', cookie);
    }
    return response;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[mobile-apple]', err.message, err.stack);
    return new NextResponse(
      '<!DOCTYPE html><html><body><p>Something went wrong. Try again.</p></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
