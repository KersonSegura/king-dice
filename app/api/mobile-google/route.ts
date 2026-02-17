import { NextRequest, NextResponse } from 'next/server';

/** Parse Set-Cookie header(s) into a Cookie header value (name=value; name2=value2). */
function getCookieHeaderFromResponse(res: Response): string {
  const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie !== 'function') return '';
  const list = getSetCookie();
  return list
    .map((s) => {
      const idx = s.indexOf(';');
      return idx > 0 ? s.slice(0, idx).trim() : s.trim();
    })
    .filter(Boolean)
    .join('; ');
}

/** Collect all Set-Cookie header values from a response. */
function getAllSetCookies(res: Response): string[] {
  const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie !== 'function') return [];
  return getSetCookie();
}

/**
 * GET /api/mobile-google?callbackUrl=...
 * Does the NextAuth Google sign-in start entirely server-side, then returns
 * a 302 redirect to Google. The in-app browser never runs any HTML/JS — it
 * just follows the redirect. Lives outside /api/auth/ so NextAuth catch-all
 * does not handle this GET.
 */
export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') ?? '';
  const origin = request.nextUrl.origin;

  if (!callbackUrl) {
    return new NextResponse(
      '<!DOCTYPE html><html><body><p>Missing callbackUrl</p></body></html>',
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const allSetCookies: string[] = [];

  try {
    // 1) Get CSRF token and cookie from NextAuth
    const csrfRes = await fetch(`${origin}/api/auth/csrf`, { cache: 'no-store' });
    const csrfData = await csrfRes.json().catch(() => ({}));
    const csrfToken = typeof csrfData?.csrfToken === 'string' ? csrfData.csrfToken : '';
    allSetCookies.push(...getAllSetCookies(csrfRes));
    const cookieFromCsrf = getCookieHeaderFromResponse(csrfRes);

    if (!csrfToken) {
      return new NextResponse(
        '<!DOCTYPE html><html><body><p>Could not start sign-in. Try again.</p></body></html>',
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // 2) POST to NextAuth signin/google (same as the web form); get 302 to Google
    const postBody = new URLSearchParams({
      csrfToken,
      callbackUrl,
    });
    const signinRes = await fetch(`${origin}/api/auth/signin/google`, {
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
      return new NextResponse(
        '<!DOCTYPE html><html><body><p>Sign-in could not start. Try again.</p></body></html>',
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // 3) Redirect the user's browser to Google; forward cookies so callback works
    const response = NextResponse.redirect(location, 302);
    response.headers.set('Cache-Control', 'no-store');
    for (const cookie of allSetCookies) {
      response.headers.append('Set-Cookie', cookie);
    }
    return response;
  } catch (e) {
    console.error('[mobile-google]', e);
    return new NextResponse(
      '<!DOCTYPE html><html><body><p>Something went wrong. Try again.</p></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
