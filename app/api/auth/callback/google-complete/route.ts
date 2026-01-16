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
    
    // Get NextAuth session (should be established by now)
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      // No session yet, redirect to return URL (will show as logged out)
      return NextResponse.redirect(new URL(returnUrl, request.url));
    }

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

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    // On error, still redirect but without auth cookie
    const returnUrl = request.nextUrl.searchParams.get('return') || '/';
    return NextResponse.redirect(new URL(returnUrl, request.url));
  }
}
