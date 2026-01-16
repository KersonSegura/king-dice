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
    // Get the return URL from query params
    const returnUrl = request.nextUrl.searchParams.get('return') || '/';
    
    console.log('🔄 OAuth callback completion - Getting session...');
    
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
      // Redirect to home with error message
      const errorUrl = new URL(returnUrl, request.url);
      errorUrl.searchParams.set('error', 'oauth_no_session');
      return NextResponse.redirect(errorUrl);
    }

    console.log('✅ Session found, setting auth_token cookie...');

    // Create response with user data
    const response = NextResponse.redirect(new URL(returnUrl, request.url));

    // Set the auth_token cookie that the existing system expects
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    };

    response.cookies.set('auth_token', session.accessToken, cookieOptions);
    
    console.log('✅ Auth token cookie set, redirecting to:', returnUrl);

    return response;
  } catch (error) {
    console.error('❌ OAuth callback completion error:', error);
    // On error, redirect with error parameter
    const returnUrl = request.nextUrl.searchParams.get('return') || '/';
    const errorUrl = new URL(returnUrl, request.url);
    errorUrl.searchParams.set('error', 'oauth_callback_error');
    return NextResponse.redirect(errorUrl);
  }
}
