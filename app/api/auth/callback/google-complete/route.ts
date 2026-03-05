import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getUserFromToken } from '@/lib/auth';
import { generateCode, setMobileAuthCode } from '@/lib/mobile-auth-codes';

/**
 * Completes mobile OAuth callback (Google/Apple).
 * Syncs NextAuth session into auth_token and redirects back to app/web.
 */
export async function GET(request: NextRequest) {
  try {
    // Get the return URL from query params, clean it up to prevent loops
    let returnUrl = request.nextUrl.searchParams.get('return') || '/';
    
    // Clean up return URL to prevent redirect loops
    try {
      const returnUrlObj = new URL(returnUrl, request.url);
      returnUrlObj.searchParams.delete('error');
      returnUrlObj.searchParams.delete('callbackUrl');
      returnUrl = returnUrlObj.toString();
    } catch {
      // If URL parsing fails, use base path
      const basePath = new URL(returnUrl, request.url);
      returnUrl = basePath.pathname;
    }
    
    console.log('🔄 OAuth callback completion - Getting session...');
    console.log('📋 Return URL:', returnUrl);
    
    // Get NextAuth session. Apple can occasionally lag one redirect, so retry briefly.
    let session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      for (let i = 0; i < 4; i++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        session = await getServerSession(authOptions);
        if (session?.accessToken) break;
      }
    }
    
    console.log('📋 Session data:', session ? {
      hasAccessToken: !!session.accessToken,
      userId: session.userId,
      username: session.username,
      email: session.user?.email
    } : 'No session');
    
    if (!session || !session.accessToken) {
      console.error('❌ No session or access token found');
      // Redirect to home without error parameter to prevent loops
      const cleanUrl = new URL(returnUrl, request.url);
      cleanUrl.searchParams.delete('error');
      cleanUrl.searchParams.delete('callbackUrl');
      return NextResponse.redirect(cleanUrl);
    }

    console.log('✅ Session found, setting auth_token cookie...');

    // Create clean redirect URL
    const redirectUrl = new URL(returnUrl, request.url);
    redirectUrl.searchParams.delete('error');
    redirectUrl.searchParams.delete('callbackUrl');

    // One-time code for mobile app return flow. Be tolerant with path/query variants.
    const isAppRedirect = redirectUrl.searchParams.get('redirect') === 'app';
    const isMobileDonePath = redirectUrl.pathname === '/auth/mobile-done' || redirectUrl.pathname === '/auth/mobile-done/';
    if (isAppRedirect || isMobileDonePath) {
      const code = generateCode();
      const userResult = await getUserFromToken(session.accessToken);
      if (userResult.success && userResult.user) {
        setMobileAuthCode(code, session.accessToken, {
          id: userResult.user.id,
          username: userResult.user.username,
          email: userResult.user.email,
          avatar: userResult.user.avatar,
        });
        redirectUrl.searchParams.set('code', code);
      }
    }

    const response = NextResponse.redirect(redirectUrl);

    // Set the auth_token cookie that the existing system expects (web)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    };

    response.cookies.set('auth_token', session.accessToken, cookieOptions);

    console.log('✅ Auth token cookie set, redirecting to:', redirectUrl.toString());

    return response;
  } catch (error) {
    console.error('❌ OAuth callback completion error:', error);
    // On error, redirect to home without error parameters
    const cleanUrl = new URL('/', request.url);
    return NextResponse.redirect(cleanUrl);
  }
}
