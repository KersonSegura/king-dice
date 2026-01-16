import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

/**
 * This endpoint handles the OAuth callback after Google sign-in
 * It syncs NextAuth session with the custom auth_token cookie system
 * and redirects the user back to where they started
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
    
    // Get NextAuth session (should be established by now)
    const session = await getServerSession(authOptions);
    
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
    
    const response = NextResponse.redirect(redirectUrl);

    // Set the auth_token cookie that the existing system expects
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
